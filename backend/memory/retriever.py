from memory.embedder import Embedder
from storage.vector_store import VectorStore


class Retriever:
    def __init__(self, embedder: Embedder, vector_store: VectorStore) -> None:
        self.embedder = embedder
        self.vector_store = vector_store

    async def hybrid_search(self, query: str, n_results: int = 5) -> list[dict]:
        embedding = await self.embedder.embed_text(query)
        semantic = self.vector_store.search(embedding, n_results)
        keyword = self.vector_store.keyword_search(query, n_results)
        merged: dict[str, dict] = {}
        for result in semantic + keyword:
            existing = merged.get(result["id"])
            result["score"] = result.get("score", 0) + (
                0.15 if result in keyword else 0
            )
            if not existing or result["score"] > existing["score"]:
                merged[result["id"]] = result
        return sorted(merged.values(), key=lambda item: item["score"], reverse=True)[
            :n_results
        ]
