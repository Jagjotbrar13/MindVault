from collections.abc import AsyncGenerator

from fastapi import FastAPI
from fastapi.testclient import TestClient

from api.routes import graph, health, ingest, memory, query


class FakePipeline:
    async def ingest(
        self,
        file_path=None,
        url=None,
        text=None,
        original_filename=None,
        title=None,
        tags=None,
        reminder_due_at=None,
        reminder_frequency=None,
    ) -> dict:
        return {
            "document_id": "doc-1",
            "chunks_stored": 1,
            "source_type": "text" if text else "url",
            "title": title or original_filename or "Untitled Document",
            "summary": text or url or file_path,
            "tags": tags or [],
            "suggested_tags": tags or [],
            "reminder_due_at": reminder_due_at,
            "reminder_frequency": reminder_frequency,
        }


class FakeDatabase:
    async def get_all_documents(self) -> list[dict]:
        return [
            {"id": "doc-1", "title": "Manual note", "created_at": "2026-05-19T00:00:00"}
        ]

    async def delete_document(self, document_id: str) -> None:
        self.deleted = document_id

    async def get_recent_queries(self, limit: int = 20) -> list[dict]:
        return [{"id": "query-1", "query": "What is Raft?"}]


class FakeVectorStore:
    def delete_document(self, document_id: str) -> None:
        self.deleted = document_id


class FakeGraph:
    def get_graph_data(self) -> dict:
        return {
            "nodes": [{"id": "doc-1", "title": "Manual note", "type": "text"}],
            "links": [],
        }

    def remove_document(self, document_id: str) -> None:
        self.deleted = document_id


class FakeOllama:
    async def is_available(self) -> bool:
        return True

    async def list_models(self) -> list[str]:
        return ["phi3:mini"]


class FakeOrchestrator:
    async def process_query(self, question: str, stream: bool = False):
        result = {
            "answer": "Raft is a consensus algorithm.",
            "confidence": 0.95,
            "model_used": "phi3:mini",
            "sources": ["Manual note"],
            "query_type": "simple_lookup",
            "issues": [],
        }
        if not stream:
            return result
        return self._stream(result)

    async def _stream(self, result: dict) -> AsyncGenerator[str, None]:
        yield '{"type":"token","content":"Raft "}\n'
        yield '{"type":"done","metadata":{"answer":"Raft is a consensus algorithm.","confidence":0.95,"model_used":"phi3:mini","sources":["Manual note"],"query_type":"simple_lookup","issues":[]}}\n'


def make_app() -> FastAPI:
    app = FastAPI()
    app.state.services = {
        "pipeline": FakePipeline(),
        "database": FakeDatabase(),
        "vector_store": FakeVectorStore(),
        "graph": FakeGraph(),
        "ollama": FakeOllama(),
        "orchestrator": FakeOrchestrator(),
    }
    app.include_router(ingest.router)
    app.include_router(query.router)
    app.include_router(graph.router)
    app.include_router(memory.router)
    app.include_router(health.router)
    return app


def test_ingest_text_route() -> None:
    client = TestClient(make_app())
    response = client.post(
        "/ingest", data={"text": "Raft notes", "title": "Raft notes"}
    )

    assert response.status_code == 200
    assert response.json()["chunks_stored"] == 1
    assert response.json()["title"] == "Raft notes"


def test_query_route_returns_json() -> None:
    client = TestClient(make_app())
    response = client.post("/query", json={"query": "What is Raft?", "stream": False})

    assert response.status_code == 200
    assert response.json()["confidence"] == 0.95


def test_query_route_streams_sse() -> None:
    client = TestClient(make_app())
    response = client.post("/query", json={"query": "What is Raft?", "stream": True})

    assert response.status_code == 200
    assert "text/event-stream" in response.headers["content-type"]
    assert "data:" in response.text


def test_graph_memory_health_and_delete_routes() -> None:
    client = TestClient(make_app())

    assert client.get("/graph").json()["nodes"][0]["id"] == "doc-1"
    assert client.get("/memory").json()[0]["id"] == "doc-1"
    assert client.get("/memory/history").json()[0]["query"] == "What is Raft?"
    assert client.get("/health").json()["ollama"] is True
    assert client.delete("/ingest/doc-1").json() == {
        "deleted": True,
        "document_id": "doc-1",
    }
