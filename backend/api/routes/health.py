from fastapi import APIRouter, Depends

from api.deps import services

router = APIRouter(prefix="/health", tags=["health"])


@router.get("")
async def health(svc: dict = Depends(services)) -> dict:
    docs = await svc["database"].get_all_documents()
    graph = svc["graph"].get_graph_data()
    return {
        "status": "ok",
        "ollama": await svc["ollama"].is_available(),
        "documents": len(docs),
        "queries": len(await svc["database"].get_recent_queries(1000)),
        "connections": len(graph["links"]),
        "models": await svc["ollama"].list_models(),
    }
