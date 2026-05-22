import json

from fastapi import APIRouter, Depends

from api.deps import services

router = APIRouter(prefix="/graph", tags=["graph"])


@router.get("")
async def graph(svc: dict = Depends(services)) -> dict:
    graph_data = svc["graph"].get_graph_data()
    documents = {doc["id"]: doc for doc in await svc["database"].get_all_documents()}
    for node in graph_data.get("nodes", []):
        doc = documents.get(node.get("id"), {})
        node["tags"] = _decode_tags(doc.get("tags"))
        node["created_at"] = doc.get("created_at") or node.get("created_at")
        node["summary"] = doc.get("summary") or node.get("summary") or ""
        node["chunk_count"] = doc.get("chunk_count") or node.get("chunk_count") or 0
        node["type"] = doc.get("source_type") or node.get("type") or "text"
    return graph_data


def _decode_tags(value: object) -> list[str]:
    if isinstance(value, list):
        return [str(tag) for tag in value]
    try:
        return [str(tag) for tag in json.loads(str(value or "[]"))]
    except json.JSONDecodeError:
        return []
