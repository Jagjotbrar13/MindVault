import re


def chunk_text(text: str, chunk_size: int = 512, overlap: int = 64) -> list[str]:
    clean = re.sub(r"\s+", " ", text or "").strip()
    if not clean:
        return []
    sentences = re.split(r"(?<=[.!?])\s+", clean)
    chunks: list[str] = []
    current = ""
    for sentence in sentences:
        if not sentence:
            continue
        candidate = f"{current} {sentence}".strip()
        if len(candidate) <= chunk_size or not current:
            current = candidate
            continue
        chunks.append(current)
        tail = current[-overlap:].strip()
        current = f"{tail} {sentence}".strip() if tail else sentence
    if current:
        chunks.append(current)
    return chunks
