class TextProcessor:
    def process(self, text: str, source_name: str = "manual") -> dict:
        return {
            "text": text,
            "source": source_name,
            "title": source_name,
            "metadata": {},
        }
