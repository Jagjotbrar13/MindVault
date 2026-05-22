import ast
import json
from typing import Any

from utils.ollama_client import OllamaClient


class CriticModel:
    def __init__(self, client: OllamaClient | None = None) -> None:
        self.client = client or OllamaClient()

    async def critique(self, query: str, answer: str, context: list[str]) -> dict:
        messages = [
            {
                "role": "system",
                "content": (
                    "You are a quality critic. Review this answer for accuracy, completeness, and grounding "
                    "in the provided context. Be strict. Return valid JSON with confidence, issues, "
                    "refined_answer, needs_escalation. refined_answer must be plain markdown text, not an object."
                ),
            },
            {
                "role": "user",
                "content": f"Query: {query}\nAnswer: {answer}\nContext:\n{chr(10).join(context)}",
            },
        ]
        try:
            raw = str(
                await self.client.chat(
                    "mistral:7b", messages, options={"temperature": 0}
                )
            )
            data = json.loads(raw[raw.find("{") : raw.rfind("}") + 1])
            refined = self._plain_text(data.get("refined_answer") or answer)
            return {
                "confidence": max(0.0, min(1.0, float(data.get("confidence", 0.5)))),
                "issues": [str(issue) for issue in data.get("issues", [])],
                "refined_answer": refined,
                "needs_escalation": bool(data.get("needs_escalation", False)),
            }
        except Exception:
            return {
                "confidence": 0.5,
                "issues": ["Critic unavailable or returned invalid JSON."],
                "refined_answer": self._plain_text(answer),
                "needs_escalation": False,
            }

    def _plain_text(self, value: Any) -> str:
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
                    return self._plain_text(value[key])
            return "\n".join(
                f"{key}: {self._plain_text(item)}" for key, item in value.items()
            )
        if isinstance(value, list):
            return "\n".join(self._plain_text(item) for item in value)
        text = str(value or "").strip()
        if text.startswith(("{", "[")):
            try:
                return self._plain_text(json.loads(text))
            except json.JSONDecodeError:
                try:
                    return self._plain_text(ast.literal_eval(text))
                except (SyntaxError, ValueError):
                    return text
        return text
