class Summarizer:
    def summarize(self, text: str, length: int = 200) -> str:
        clean = " ".join((text or "").replace("None None None", "").split())
        return clean[:length] + ("..." if len(clean) > length else "")
