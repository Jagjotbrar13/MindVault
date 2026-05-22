from memory.retriever import Retriever


class FakeEmbedder:
    async def embed_text(self, text: str) -> list[float]:
        assert text == "raft"
        return [0.1, 0.2, 0.3]


class FakeVectorStore:
    def search(self, query_embedding: list[float], n_results: int = 5) -> list[dict]:
        assert query_embedding == [0.1, 0.2, 0.3]
        return [
            {
                "id": "a",
                "chunk": "semantic raft",
                "metadata": {"source": "A"},
                "score": 0.8,
            },
            {
                "id": "b",
                "chunk": "semantic consensus",
                "metadata": {"source": "B"},
                "score": 0.6,
            },
        ]

    def keyword_search(self, query: str, n_results: int = 5) -> list[dict]:
        assert query == "raft"
        return [
            {
                "id": "a",
                "chunk": "keyword raft",
                "metadata": {"source": "A"},
                "score": 0.9,
            },
            {
                "id": "c",
                "chunk": "keyword log",
                "metadata": {"source": "C"},
                "score": 0.5,
            },
        ]


async def test_hybrid_search_merges_deduplicates_and_keeps_metadata() -> None:
    retriever = Retriever(FakeEmbedder(), FakeVectorStore())

    results = await retriever.hybrid_search("raft", 5)

    assert [result["id"] for result in results] == ["a", "c", "b"]
    assert results[0]["chunk"] == "keyword raft"
    assert results[0]["metadata"]["source"] == "A"
