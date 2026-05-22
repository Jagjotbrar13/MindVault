import json
from datetime import datetime

from storage.database import Database


async def test_database_document_and_query_crud(tmp_path) -> None:
    database = Database(str(tmp_path / "mindvault.db"))
    await database.initialize()

    document = {
        "id": "doc-1",
        "title": "Lecture",
        "source_type": "text",
        "file_path": "",
        "url": "",
        "summary": "A short summary",
        "created_at": datetime.utcnow().isoformat(),
        "chunk_count": 2,
        "metadata": json.dumps({"course": "CMPUT 402"}),
        "centroid": json.dumps([0.1, 0.2]),
    }
    await database.add_document(document)

    all_documents = await database.get_all_documents()
    stored = await database.get_document("doc-1")

    assert len(all_documents) == 1
    assert stored is not None
    assert stored["title"] == "Lecture"
    assert stored["chunk_count"] == 2

    await database.add_query(
        {
            "id": "query-1",
            "query": "What is in the lecture?",
            "answer": "A short summary",
            "model_used": "phi3:mini",
            "confidence": 0.9,
            "created_at": datetime.utcnow().isoformat(),
        }
    )
    queries = await database.get_recent_queries()

    assert len(queries) == 1
    assert queries[0]["model_used"] == "phi3:mini"

    await database.delete_document("doc-1")
    assert await database.get_document("doc-1") is None
