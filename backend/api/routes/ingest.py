import json

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile

from api.deps import services
from storage.file_store import FileStore

router = APIRouter(prefix="/ingest", tags=["ingest"])


@router.post("")
async def ingest(
    file: UploadFile | None = File(default=None),
    url: str | None = Form(default=None),
    text: str | None = Form(default=None),
    title: str | None = Form(default=None),
    tags: str | None = Form(default=None),
    reminder_due_at: str | None = Form(default=None),
    reminder_frequency: str | None = Form(default=None),
    svc: dict = Depends(services),
) -> dict:
    try:
        original_filename = file.filename if file and file.filename else None
        file_path = await FileStore().save_upload(file) if file else None
        tag_list = [tag.strip() for tag in (tags or "").split(",") if tag.strip()]
        return await svc["pipeline"].ingest(
            file_path=file_path,
            url=url,
            text=text,
            original_filename=original_filename,
            title=title,
            tags=tag_list,
            reminder_due_at=reminder_due_at,
            reminder_frequency=reminder_frequency,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Ingestion failed: {exc}") from exc


@router.get("/documents")
async def documents(svc: dict = Depends(services)) -> list[dict]:
    return [_normalize(doc) for doc in await svc["database"].get_all_documents()]


@router.delete("/{document_id}")
async def delete_document(document_id: str, svc: dict = Depends(services)) -> dict:
    try:
        svc["vector_store"].delete_document(document_id)
        await svc["database"].delete_document(document_id)
        svc["graph"].remove_document(document_id)
        return {"deleted": True, "document_id": document_id}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Delete failed: {exc}") from exc


def _normalize(doc: dict) -> dict:
    normalized = dict(doc)
    try:
        normalized["tags"] = json.loads(str(doc.get("tags") or "[]"))
    except json.JSONDecodeError:
        normalized["tags"] = []
    return normalized
