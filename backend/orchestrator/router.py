from utils.ollama_client import OllamaClient


class RouterModel:
    categories = {
        "simple_lookup",
        "deep_synthesis",
        "visual_question",
        "code_question",
        "memory_search",
    }

    def __init__(self, client: OllamaClient | None = None) -> None:
        self.client = client or OllamaClient()

    async def classify_query(self, query: str) -> str:
        prompt = (
            "Classify the query into exactly one category: simple_lookup, deep_synthesis, "
            "visual_question, code_question, memory_search. Return only the category.\n\n"
            f"Query: {query}"
        )
        try:
            result = str(await self.client.generate("mistral:7b", prompt))
            category = result.strip().split()[0].strip('".,')
            return category if category in self.categories else "deep_synthesis"
        except Exception:
            return "deep_synthesis"
