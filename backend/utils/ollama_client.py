import json
import os
from collections.abc import AsyncGenerator
from typing import Any

import httpx


class OllamaError(RuntimeError):
    """Raised when the local Ollama service cannot complete a request."""


class OllamaClient:
    def __init__(self, host: str | None = None, timeout: float = 120.0) -> None:
        self.host = (host or os.getenv("OLLAMA_HOST", "http://localhost:11434")).rstrip(
            "/"
        )
        self.timeout = timeout

    async def _post(
        self, path: str, payload: dict[str, Any], stream: bool = False
    ) -> Any:
        url = f"{self.host}{path}"
        try:
            if stream:
                return self._stream(url, payload)
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(url, json=payload)
                response.raise_for_status()
                return response.json()
        except httpx.HTTPError as exc:
            raise OllamaError(f"Ollama request failed at {url}: {exc}") from exc

    async def _stream(
        self, url: str, payload: dict[str, Any]
    ) -> AsyncGenerator[str, None]:
        try:
            async with httpx.AsyncClient(timeout=None) as client:
                async with client.stream("POST", url, json=payload) as response:
                    response.raise_for_status()
                    async for line in response.aiter_lines():
                        if not line:
                            continue
                        data = json.loads(line)
                        if "response" in data:
                            yield data["response"]
                        elif "message" in data and data["message"].get("content"):
                            yield data["message"]["content"]
        except httpx.HTTPError as exc:
            raise OllamaError(f"Ollama streaming failed at {url}: {exc}") from exc

    async def generate(
        self, model: str, prompt: str, stream: bool = False
    ) -> str | AsyncGenerator[str, None]:
        payload = {"model": model, "prompt": prompt, "stream": stream}
        if stream:
            return await self._post("/api/generate", payload, stream=True)
        data = await self._post("/api/generate", payload)
        return data.get("response", "")

    async def chat(
        self,
        model: str,
        messages: list[dict[str, str]],
        stream: bool = False,
        options: dict[str, Any] | None = None,
    ) -> str | AsyncGenerator[str, None]:
        payload: dict[str, Any] = {
            "model": model,
            "messages": messages,
            "stream": stream,
        }
        if options:
            payload["options"] = options
        if stream:
            return await self._post("/api/chat", payload, stream=True)
        data = await self._post("/api/chat", payload)
        return data.get("message", {}).get("content", "")

    async def embed(self, text: str) -> list[float]:
        data = await self._post(
            "/api/embeddings", {"model": "nomic-embed-text", "prompt": text}
        )
        embedding = data.get("embedding")
        if not isinstance(embedding, list):
            raise OllamaError("Ollama returned no embedding vector.")
        return [float(value) for value in embedding]

    async def is_available(self) -> bool:
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(f"{self.host}/api/tags")
                return response.status_code == 200
        except httpx.HTTPError:
            return False

    async def list_models(self) -> list[str]:
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(f"{self.host}/api/tags")
                response.raise_for_status()
                return [
                    model.get("name", "")
                    for model in response.json().get("models", [])
                    if model.get("name")
                ]
        except httpx.HTTPError:
            return []
