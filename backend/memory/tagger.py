import json
import re
from collections import Counter

from utils.ollama_client import OllamaClient

COMMON_TAGS = [
    "work",
    "appointment",
    "research",
    "todo",
    "personal",
    "meeting-notes",
    "lecture-notes",
    "testing",
    "project",
    "code",
    "health",
    "finance",
]
STOPWORDS = {
    "the",
    "and",
    "for",
    "that",
    "with",
    "from",
    "this",
    "into",
    "your",
    "about",
    "have",
    "will",
    "are",
    "was",
    "were",
    "you",
    "they",
    "their",
    "what",
    "when",
    "where",
    "how",
    "why",
    "can",
    "could",
    "should",
    "would",
    "using",
    "use",
    "not",
    "all",
}


class Tagger:
    def __init__(self, client: OllamaClient | None = None) -> None:
        self.client = client or OllamaClient()

    async def suggest_tags(
        self, title: str, text: str, existing_tags: list[str] | None = None
    ) -> list[str]:
        vocabulary = sorted(set(COMMON_TAGS + (existing_tags or [])))[:80]
        prompt = (
            "Suggest 3 to 5 short semantic tags for this personal knowledge item. "
            "Use lowercase kebab-case. Prefer the user's existing vocabulary when it fits. "
            f"Existing vocabulary: {', '.join(vocabulary)}\n"
            f"Title: {title}\nContent: {text[:1800]}\nReturn JSON only: [\"tag\"]"
        )
        try:
            raw = str(
                await self.client.chat(
                    "phi3:mini",
                    [{"role": "user", "content": prompt}],
                    options={"num_predict": 80, "temperature": 0.1},
                )
            )
            start = raw.find("[")
            end = raw.rfind("]")
            tags = (
                json.loads(raw[start : end + 1]) if start >= 0 and end > start else []
            )
            return self._clean(tags, text, existing_tags)
        except Exception:
            return self._fallback(title, text, existing_tags)

    def _fallback(
        self, title: str, text: str, existing_tags: list[str] | None = None
    ) -> list[str]:
        content = f"{title} {text}".lower()
        tags: list[str] = []
        keyword_map = {
            "meeting-notes": ["meeting", "agenda", "minutes", "discuss"],
            "todo": ["todo", "task", "deadline", "submit", "complete", "reminder"],
            "research": ["research", "paper", "study", "analysis", "evidence"],
            "testing": [
                "test",
                "unit",
                "integration",
                "verification",
                "ci",
                "github actions",
            ],
            "code": ["code", "function", "class", "repository", "git", "build"],
            "lecture-notes": ["lecture", "course", "lab", "assignment", "exam"],
            "project": ["project", "milestone", "deliverable", "workflow"],
            "appointment": ["appointment", "schedule", "doctor", "call"],
        }
        for tag, needles in keyword_map.items():
            if any(needle in content for needle in needles):
                tags.append(tag)
        words = re.findall(r"[a-z][a-z0-9-]{3,}", content)
        counts = Counter(word for word in words if word not in STOPWORDS)
        tags.extend(word for word, _ in counts.most_common(8))
        return self._clean(tags, text, existing_tags)

    def _clean(
        self, tags: list[object], text: str, existing_tags: list[str] | None = None
    ) -> list[str]:
        cleaned: list[str] = []
        known = {tag.lower() for tag in existing_tags or []}
        for tag in tags:
            value = re.sub(r"[^a-z0-9-]+", "-", str(tag).strip().lower()).strip("-")
            if not value or value in STOPWORDS or value in cleaned:
                continue
            if value in known:
                cleaned.insert(0, value)
            else:
                cleaned.append(value)
        return cleaned[:5] or ["note", "personal", "todo"][:3]
