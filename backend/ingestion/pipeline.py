import json
import re
import uuid
from datetime import datetime
from pathlib import Path

import numpy as np

from ingestion.audio_processor import AudioProcessor
from ingestion.image_processor import ImageProcessor
from ingestion.pdf_processor import PDFProcessor
from ingestion.text_processor import TextProcessor
from ingestion.url_processor import URLProcessor
from ingestion.video_processor import VideoProcessor
from memory.embedder import Embedder
from memory.graph_builder import GraphBuilder
from memory.summarizer import Summarizer
from memory.tagger import Tagger
from storage.database import Database
from storage.vector_store import VectorStore
from utils import chunker


class IngestPipeline:
    def __init__(
        self,
        embedder: Embedder,
        vector_store: VectorStore,
        database: Database,
        graph_builder: GraphBuilder,
    ) -> None:
        self.embedder = embedder
        self.vector_store = vector_store
        self.database = database
        self.graph_builder = graph_builder
        self.summarizer = Summarizer()
        self.tagger = Tagger()

    async def ingest(
        self,
        file_path: str | None = None,
        url: str | None = None,
        text: str | None = None,
        original_filename: str | None = None,
        title: str | None = None,
        tags: list[str] | None = None,
        reminder_due_at: str | None = None,
        reminder_frequency: str | None = None,
    ) -> dict:
        document_id = str(uuid.uuid4())
        source_type = "text"
        clean_title = self._clean_manual_title(title)
        result: dict
        if url:
            source_type, result = "url", await URLProcessor().process(url)
            clean_title = self._clean_title(
                clean_title or result.get("title"), None, url
            )
        elif text is not None:
            if not clean_title:
                raise ValueError("A custom title is required for manual notes.")
            result = TextProcessor().process(text, clean_title)
        elif file_path:
            suffix = Path(file_path).suffix.lower()
            if suffix == ".pdf":
                source_type, result = "pdf", PDFProcessor().process(file_path)
            elif suffix in {".mp3", ".wav"}:
                source_type, result = "audio", await AudioProcessor().process(file_path)
            elif suffix == ".mp4":
                source_type, result = "video", await VideoProcessor().process(file_path)
            elif suffix in {".png", ".jpg", ".jpeg"}:
                source_type, result = "image", await ImageProcessor().process(file_path)
            elif suffix in {".txt", ".md"}:
                source_type, result = (
                    "text",
                    TextProcessor().process(
                        Path(file_path).read_text(encoding="utf-8"),
                        original_filename or Path(file_path).name,
                    ),
                )
            else:
                raise ValueError(f"Unsupported input type: {suffix}")
            clean_title = self._clean_title(
                clean_title or result.get("metadata", {}).get("title"),
                file_path,
                original_filename,
            )
        else:
            raise ValueError("Provide file_path, url, or text.")

        content = self._clean_content(
            result.get("text") or result.get("description") or ""
        )
        chunks = chunker.chunk_text(content)
        existing_tags = self._all_existing_tags(await self.database.get_all_documents())
        suggested_tags = await self.tagger.suggest_tags(
            clean_title, content, existing_tags
        )
        final_tags = self._merge_tags(tags or [], suggested_tags)
        metadata = {
            "title": clean_title,
            "source_type": source_type,
            "file_path": file_path or result.get("file_path", ""),
            "url": url or "",
            "source": clean_title,
            "tags": final_tags,
        }
        embedded = await self.embedder.embed_chunks(chunks, document_id, metadata)
        self.vector_store.add(embedded)
        centroid = (
            np.mean([item["embedding"] for item in embedded], axis=0).tolist()
            if embedded
            else []
        )
        summary = self.summarizer.summarize(content)
        reminder_status = "scheduled" if reminder_due_at else "none"
        doc = {
            "id": document_id,
            "title": clean_title,
            "source_type": source_type,
            "file_path": file_path or "",
            "url": url or "",
            "summary": summary,
            "created_at": datetime.utcnow().isoformat(),
            "chunk_count": len(chunks),
            "metadata": json.dumps(result.get("metadata", {})),
            "centroid": json.dumps(centroid),
            "tags": json.dumps(final_tags),
            "reminder_due_at": reminder_due_at or None,
            "reminder_frequency": reminder_frequency if reminder_due_at else None,
            "reminder_status": reminder_status,
            "reminder_completed_at": None,
        }
        await self.database.add_document(doc)
        await self.graph_builder.add_document(
            document_id, clean_title, chunks, source_type, summary, centroid
        )
        return {
            "document_id": document_id,
            "chunks_stored": len(chunks),
            "source_type": source_type,
            "title": clean_title,
            "summary": summary,
            "tags": final_tags,
            "suggested_tags": suggested_tags,
            "reminder_due_at": reminder_due_at,
            "reminder_frequency": reminder_frequency,
        }

    def _clean_manual_title(self, title: str | None) -> str | None:
        value = " ".join((title or "").split()).strip()
        return value or None

    def _clean_title(
        self,
        extracted_title: str | None,
        file_path: str | None,
        original_filename: str | None,
    ) -> str:
        candidates = [
            extracted_title,
            original_filename,
            Path(file_path).name if file_path else None,
            "Untitled Document",
        ]
        for candidate in candidates:
            value = " ".join(str(candidate or "").replace("None", "").split()).strip()
            if (
                value
                and not self._looks_like_uuid_filename(value)
                and value.lower() != "manual note"
            ):
                return value
        return "Untitled Document"

    def _looks_like_uuid_filename(self, value: str) -> bool:
        stem = Path(value).stem
        return bool(
            re.fullmatch(
                r"[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}",
                stem,
            )
        )

    def _clean_content(self, content: str) -> str:
        return re.sub(r"\bNone\b(?:\s+\bNone\b)*", "", content or "").strip()

    def _all_existing_tags(self, docs: list[dict]) -> list[str]:
        tags: list[str] = []
        for doc in docs:
            try:
                tags.extend(json.loads(doc.get("tags") or "[]"))
            except json.JSONDecodeError:
                continue
        return sorted(set(str(tag) for tag in tags if tag))

    def _merge_tags(self, user_tags: list[str], suggested_tags: list[str]) -> list[str]:
        merged: list[str] = []
        for tag in [*user_tags, *suggested_tags]:
            value = re.sub(r"[^a-zA-Z0-9-]+", "-", str(tag).strip().lower()).strip("-")
            if value and value not in merged:
                merged.append(value)
        return merged[:8]
