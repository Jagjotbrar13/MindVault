import ast
import json
import os
import re
import uuid
from collections.abc import AsyncGenerator
from datetime import datetime
from typing import Any

from memory.retriever import Retriever
from orchestrator.critic import CriticModel
from orchestrator.fast import FastModel
from orchestrator.reasoner import ReasonerModel
from orchestrator.router import RouterModel
from orchestrator.vision import VisionModel
from storage.database import Database


class MasterOrchestrator:
    def __init__(self, retriever: Retriever, database: Database) -> None:
        self.retriever = retriever
        self.database = database
        self.router = RouterModel()
        self.reasoner = ReasonerModel()
        self.fast = FastModel()
        self.critic = CriticModel()
        self.vision = VisionModel()

    async def process_query(
        self, query: str, stream: bool = False
    ) -> dict | AsyncGenerator[str, None]:
        query_type = await self.router.classify_query(query)
        results = await self.retriever.hybrid_search(query, 5)
        context = [item["chunk"] for item in results]
        source_chunks = self._source_chunks(results)
        sources = [item["title"] for item in source_chunks]

        answer, model_used = await self._answer_for_type(
            query_type, query, context, results
        )
        answer = self._answer_text(answer)
        critique = await self.critic.critique(query, answer, context)
        if critique["needs_escalation"] and model_used != "llama3:8b":
            answer = self._answer_text(await self.reasoner.synthesize(query, context))
            model_used = "llama3:8b"
            critique = await self.critic.critique(query, answer, context)

        final_answer = self._answer_text(critique.get("refined_answer") or answer)
        final = {
            "answer": final_answer,
            "confidence": critique["confidence"],
            "model_used": model_used,
            "sources": list(dict.fromkeys(sources)),
            "source_chunks": source_chunks,
            "query_type": query_type,
            "issues": critique["issues"],
        }
        await self._record_query(query, final)
        if stream:
            return self._stream_result(final)
        return final

    async def _answer_for_type(
        self,
        query_type: str,
        query: str,
        context: list[str],
        results: list[dict[str, Any]],
    ) -> tuple[str, str]:
        model_used = "phi3:mini"
        if query_type in {"simple_lookup", "memory_search"}:
            answer = await self.fast.answer(query, context)
        elif query_type == "visual_question":
            image_path = self._find_image_path(results)
            if image_path:
                answer = await self.vision.describe_image(image_path, query)
                model_used = "llava:7b"
            else:
                answer = "I found visual-question intent, but no image source was retrieved for this query. I can answer only from the retrieved text context."
                model_used = "llava:7b"
        else:
            answer = await self.reasoner.synthesize(query, context)
            model_used = "llama3:8b"
        return self._answer_text(answer), model_used

    def _answer_text(self, value: Any) -> str:
        if isinstance(value, dict):
            for key in (
                "answer",
                "summary",
                "response",
                "content",
                "refined_answer",
                "Lab 1 Summary",
            ):
                if key in value:
                    return self._answer_text(value[key])
            return "\n".join(
                f"{key}: {self._answer_text(item)}" for key, item in value.items()
            )
        if isinstance(value, list):
            return "\n".join(self._answer_text(item) for item in value)
        text = str(value or "").strip()
        parsed = self._parse_structured_answer(text)
        if parsed is not None:
            return self._answer_text(parsed)
        text = re.sub(
            r"^```(?:json|python)?\s*|\s*```$", "", text, flags=re.IGNORECASE
        ).strip()
        return text

    def _parse_structured_answer(self, text: str) -> Any | None:
        stripped = text.strip()
        if not stripped or stripped[0] not in "[{":
            return None
        try:
            return json.loads(stripped)
        except json.JSONDecodeError:
            try:
                return ast.literal_eval(stripped)
            except (SyntaxError, ValueError):
                return None

    def _source_chunks(self, results: list[dict[str, Any]]) -> list[dict[str, Any]]:
        chunks: list[dict[str, Any]] = []
        seen: set[tuple[str, int]] = set()
        for item in results:
            metadata = item.get("metadata", {})
            title = metadata.get("title") or metadata.get("source") or "Unknown Source"
            chunk_index = int(metadata.get("chunk_index", len(chunks)) or 0)
            key = (str(title), chunk_index)
            if key in seen:
                continue
            seen.add(key)
            chunks.append(
                {
                    "title": str(title),
                    "chunk": self._answer_text(item.get("chunk", ""))[:1600],
                    "chunk_index": chunk_index,
                    "source_type": str(metadata.get("source_type", "text")),
                    "score": float(item.get("score", 0) or 0),
                }
            )
        return chunks

    def _find_image_path(self, results: list[dict[str, Any]]) -> str | None:
        for item in results:
            metadata = item.get("metadata", {})
            source_type = str(metadata.get("source_type", ""))
            file_path = str(metadata.get("file_path", ""))
            if (
                source_type.startswith("image")
                and file_path
                and os.path.exists(file_path)
            ):
                return file_path
        return None

    async def _record_query(self, query: str, final: dict[str, Any]) -> None:
        await self.database.add_query(
            {
                "id": str(uuid.uuid4()),
                "query": query,
                "answer": final["answer"],
                "model_used": final["model_used"],
                "confidence": final["confidence"],
                "created_at": datetime.utcnow().isoformat(),
            }
        )

    async def _stream_result(self, result: dict[str, Any]) -> AsyncGenerator[str, None]:
        for word in result["answer"].split(" "):
            yield json.dumps({"type": "token", "content": word + " "}) + "\n"
        yield json.dumps({"type": "done", "metadata": result}) + "\n"
