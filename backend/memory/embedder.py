from typing import Any

from utils.ollama_client import OllamaClient


class Embedder:
    def __init__(self, client: OllamaClient | None = None) -> None:
        self.client = client or OllamaClient()

    async def embed_text(self, text: str) -> list[float]:
        return await self.client.embed(text)

    async def embed_chunks(
        self, chunks: list[str], document_id: str, metadata: dict[str, Any]
    ) -> list[dict]:
        embedded = []
        for index, chunk in enumerate(chunks):
            embedded.append(
                {
                    "chunk": chunk,
                    "embedding": await self.embed_text(chunk),
                    "document_id": document_id,
                    "chunk_index": index,
                    "metadata": metadata,
                }
            )
        return embedded
