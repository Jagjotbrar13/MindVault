from utils.ollama_client import OllamaClient


class FastModel:
    def __init__(self, client: OllamaClient | None = None) -> None:
        self.client = client or OllamaClient()

    async def answer(self, query: str, context: list[str]) -> str:
        messages = [
            {
                "role": "system",
                "content": "Answer briefly using only the provided context. Say when context is insufficient.",
            },
            {
                "role": "user",
                "content": f"Context:\n{chr(10).join(context)}\n\nQuestion: {query}",
            },
        ]
        try:
            return str(
                await self.client.chat(
                    "phi3:mini", messages, options={"num_predict": 200}
                )
            )
        except Exception:
            return self._fallback_answer(query, context)

    def _fallback_answer(self, query: str, context: list[str]) -> str:
        if not context:
            return "I could not reach the local fast model, and I do not have enough retrieved context to answer this safely."
        best = " ".join(context[:2]).strip()
        if len(best) > 900:
            best = best[:900].rsplit(" ", 1)[0] + "..."
        return f"The local fast model had trouble responding, so here is the most relevant retrieved context for your question: {best}"
