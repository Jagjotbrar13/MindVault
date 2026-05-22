import json
from datetime import datetime, timedelta, timezone
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from api.deps import services

router = APIRouter(prefix="/memory", tags=["memory"])


class TagsUpdate(BaseModel):
    tags: list[str]


class ReminderUpdate(BaseModel):
    due_at: str | None = None
    frequency: Literal["once", "daily", "weekly"] | None = None
    status: Literal["scheduled", "due", "dismissed", "complete", "none"] = "scheduled"


class DigestRead(BaseModel):
    period: Literal["daily", "weekly"]


@router.get("")
async def memory(svc: dict = Depends(services)) -> list[dict]:
    return [_normalize_doc(doc) for doc in await svc["database"].get_all_documents()]


@router.get("/history")
async def history(svc: dict = Depends(services)) -> list[dict]:
    return await svc["database"].get_recent_queries()


@router.get("/tags")
async def tags(svc: dict = Depends(services)) -> list[dict]:
    counts: dict[str, int] = {}
    for doc in await svc["database"].get_all_documents():
        for tag in _decode_tags(doc):
            counts[tag] = counts.get(tag, 0) + 1
    return [
        {"tag": tag, "count": count}
        for tag, count in sorted(counts.items(), key=lambda item: (-item[1], item[0]))
    ]


@router.put("/{document_id}/tags")
async def update_tags(
    document_id: str, payload: TagsUpdate, svc: dict = Depends(services)
) -> dict:
    clean = _clean_tags(payload.tags)
    doc = await svc["database"].update_document_tags(document_id, json.dumps(clean))
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")
    return _normalize_doc(doc)


@router.get("/reminders/due")
async def due_reminders(svc: dict = Depends(services)) -> list[dict]:
    now = datetime.now(timezone.utc).isoformat()
    docs = await svc["database"].get_due_reminders(now)
    for doc in docs:
        if doc.get("reminder_status") == "scheduled":
            await svc["database"].update_reminder(
                doc["id"],
                doc.get("reminder_due_at"),
                doc.get("reminder_frequency"),
                "due",
            )
            doc["reminder_status"] = "due"
    return [_normalize_doc(doc) for doc in docs]


@router.put("/{document_id}/reminder")
async def update_reminder(
    document_id: str, payload: ReminderUpdate, svc: dict = Depends(services)
) -> dict:
    doc = await svc["database"].update_reminder(
        document_id, payload.due_at, payload.frequency, payload.status
    )
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")
    return _normalize_doc(doc)


@router.post("/{document_id}/reminder/dismiss")
async def dismiss_reminder(document_id: str, svc: dict = Depends(services)) -> dict:
    doc = await svc["database"].get_document(document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")
    frequency = doc.get("reminder_frequency")
    due_at = doc.get("reminder_due_at")
    if frequency in {"daily", "weekly"} and due_at:
        next_due = _next_due(due_at, frequency)
        updated = await svc["database"].update_reminder(
            document_id, next_due, frequency, "scheduled"
        )
    else:
        updated = await svc["database"].update_reminder(
            document_id, due_at, frequency, "dismissed"
        )
    return _normalize_doc(updated or doc)


@router.post("/{document_id}/reminder/complete")
async def complete_reminder(document_id: str, svc: dict = Depends(services)) -> dict:
    now = datetime.now(timezone.utc).isoformat()
    doc = await svc["database"].get_document(document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")
    updated = await svc["database"].update_reminder(
        document_id,
        doc.get("reminder_due_at"),
        doc.get("reminder_frequency"),
        "complete",
        now,
    )
    return _normalize_doc(updated or doc)


@router.get("/digest")
async def digest(
    period: Literal["daily", "weekly"] = "daily", svc: dict = Depends(services)
) -> dict:
    docs = [_normalize_doc(doc) for doc in await svc["database"].get_all_documents()]
    queries = await svc["database"].get_recent_queries(30)
    graph = svc["graph"].get_graph_data()
    days = 1 if period == "daily" else 7
    since = datetime.now(timezone.utc) - timedelta(days=days)
    recent_docs = [doc for doc in docs if _parse_date(doc.get("created_at")) >= since]
    upcoming = [
        doc
        for doc in docs
        if doc.get("reminder_due_at")
        and doc.get("reminder_status") in {"scheduled", "due"}
    ]
    top_tags = _top_tags(recent_docs or docs)
    bullets = []
    if recent_docs:
        bullets.append(
            f"Added {len(recent_docs)} new memories, led by {recent_docs[0]['title']}."
        )
    else:
        bullets.append(
            "No new memories in this window; your vault is quiet and ready for the next capture."
        )
    bullets.append(
        f"Your graph currently has {len(graph.get('links', []))} meaningful connections across {len(graph.get('nodes', []))} memories."
    )
    if upcoming:
        bullets.append(
            f"{len(upcoming)} reminder{'s' if len(upcoming) != 1 else ''} are scheduled, with {upcoming[0]['title']} next."
        )
    if top_tags:
        bullets.append(
            f"Recurring themes: {', '.join('#' + tag for tag in top_tags[:4])}."
        )
    if queries:
        bullets.append(f"Recent questions center on: {queries[0]['query'][:90]}.")
    suggested = "Review the most connected memory and either add a follow-up note or mark the next reminder complete."
    key = f"digest_read_{period}"
    last_read = await svc["database"].get_state(key)
    generated_at = datetime.now(timezone.utc).isoformat()
    return {
        "period": period,
        "generated_at": generated_at,
        "bullets": bullets[:5],
        "suggested_action": suggested,
        "is_new": not last_read or last_read < generated_at[:10],
    }


@router.post("/digest/read")
async def mark_digest_read(payload: DigestRead, svc: dict = Depends(services)) -> dict:
    now = datetime.now(timezone.utc).isoformat()
    await svc["database"].set_state(f"digest_read_{payload.period}", now[:10], now)
    return {"ok": True, "period": payload.period, "read_at": now}


def _normalize_doc(doc: dict) -> dict:
    normalized = dict(doc)
    normalized["tags"] = _decode_tags(doc)
    return normalized


def _decode_tags(doc: dict) -> list[str]:
    value = doc.get("tags") or "[]"
    if isinstance(value, list):
        return _clean_tags(value)
    try:
        return _clean_tags(json.loads(str(value)))
    except json.JSONDecodeError:
        return []


def _clean_tags(tags: list[object]) -> list[str]:
    clean: list[str] = []
    for tag in tags:
        value = str(tag).lower().strip().replace(" ", "-")
        if value and value not in clean:
            clean.append(value)
    return clean[:12]


def _next_due(due_at: str, frequency: str) -> str:
    current = _parse_date(due_at)
    delta = timedelta(days=1 if frequency == "daily" else 7)
    now = datetime.now(timezone.utc)
    while current <= now:
        current += delta
    return current.isoformat()


def _parse_date(value: str | None) -> datetime:
    if not value:
        return datetime.min.replace(tzinfo=timezone.utc)
    try:
        parsed = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
        return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)
    except ValueError:
        return datetime.min.replace(tzinfo=timezone.utc)


def _top_tags(docs: list[dict]) -> list[str]:
    counts: dict[str, int] = {}
    for doc in docs:
        for tag in doc.get("tags", []):
            counts[tag] = counts.get(tag, 0) + 1
    return [
        tag for tag, _ in sorted(counts.items(), key=lambda item: (-item[1], item[0]))
    ]
