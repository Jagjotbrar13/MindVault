from collections.abc import AsyncGenerator

from utils.ollama_client import OllamaClient


class ReasonerModel:
    def __init__(self, client: OllamaClient | None = None) -> None:
        self.client = client or OllamaClient()

    async def synthesize(
        self, query: str, context: list[str], stream: bool = False
    ) -> str | AsyncGenerator[str, None]:
        sources = "\n".join(
            f"[{index + 1}] {item}" for index, item in enumerate(context)
        )
        messages = [
            {
                "role": "system",
                "content": (
                    "You are a personal knowledge assistant. Use only the provided context to answer. "
                    "Cite which source each piece of information comes from. Be thorough and thoughtful."
                ),
            },
            {"role": "user", "content": f"Context:\n{sources}\n\nQuestion: {query}"},
        ]
        try:
            return await self.client.chat("llama3:8b", messages, stream=stream)
        except Exception:
            return self._fallback_synthesis(context)

    def _fallback_synthesis(self, context: list[str]) -> str:
        if not context:
            return "I could not reach the local reasoning model, and no relevant context was retrieved."
        bullets = []
        for index, item in enumerate(context[:5], start=1):
            clean = " ".join(item.split())
            if len(clean) > 360:
                clean = clean[:360].rsplit(" ", 1)[0] + "..."
            bullets.append(f"- Source {index}: {clean}")
        return (
            "The local reasoning model returned an error, so I am showing a grounded summary of the retrieved sources instead:\n"
            + "\n".join(bullets)
        )
