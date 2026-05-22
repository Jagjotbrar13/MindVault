from collections.abc import AsyncGenerator

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from api.deps import services

router = APIRouter(prefix="/query", tags=["query"])


class QueryRequest(BaseModel):
    query: str
    stream: bool = False


@router.post("")
async def query(request: QueryRequest, svc: dict = Depends(services)):
    if not request.query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty.")
    try:
        result = await svc["orchestrator"].process_query(
            request.query, stream=request.stream
        )
        if request.stream:
            return StreamingResponse(_as_sse(result), media_type="text/event-stream")
        return result
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Query failed: {exc}") from exc


async def _as_sse(lines: AsyncGenerator[str, None]) -> AsyncGenerator[str, None]:
    async for line in lines:
        payload = line.strip()
        if payload:
            yield f"data: {payload}\n\n"
