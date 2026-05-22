import json
import math
import re

from storage.database import Database
from storage.graph import KnowledgeGraph


def cosine(a: list[float], b: list[float]) -> float:
    if not a or not b:
        return 0.0
    dot = sum(x * y for x, y in zip(a, b))
    return dot / (
        (math.sqrt(sum(x * x for x in a)) * math.sqrt(sum(y * y for y in b))) or 1.0
    )


def meaningful_overlap(left: str, right: str) -> float:
    stop = {
        "the",
        "and",
        "for",
        "with",
        "from",
        "this",
        "that",
        "into",
        "your",
        "notes",
        "document",
    }
    a = {word for word in re.findall(r"[a-z0-9]{4,}", left.lower()) if word not in stop}
    b = {
        word for word in re.findall(r"[a-z0-9]{4,}", right.lower()) if word not in stop
    }
    if not a or not b:
        return 0.0
    return len(a & b) / min(len(a), len(b))


class GraphBuilder:
    def __init__(self, graph: KnowledgeGraph, database: Database) -> None:
        self.graph = graph
        self.database = database

    async def add_document(
        self,
        document_id: str,
        title: str,
        chunks: list[str],
        source_type: str,
        summary: str,
        centroid: list[float],
    ) -> None:
        self.graph.add_document(document_id, title, chunks, source_type, summary)
        new_text = f"{title} {summary}"
        candidates: list[tuple[str, float]] = []
        for doc in await self.database.get_all_documents():
            if doc["id"] == document_id or not doc.get("centroid"):
                continue
            try:
                similarity = cosine(centroid, json.loads(doc["centroid"]))
            except json.JSONDecodeError:
                similarity = 0.0
            overlap = meaningful_overlap(
                new_text, f"{doc.get('title', '')} {doc.get('summary', '')}"
            )
            if similarity >= 0.78 and overlap >= 0.08:
                candidates.append((doc["id"], similarity))
        for related_id, similarity in sorted(
            candidates, key=lambda item: item[1], reverse=True
        )[:4]:
            self.graph.add_relation(document_id, related_id, similarity)
