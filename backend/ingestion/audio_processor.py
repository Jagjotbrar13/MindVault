import asyncio

import whisper


class AudioProcessor:
    _model = None

    async def process(self, file_path: str) -> dict:
        return await asyncio.to_thread(self._process_sync, file_path)

    def _process_sync(self, file_path: str) -> dict:
        if AudioProcessor._model is None:
            AudioProcessor._model = whisper.load_model("base")
        result = AudioProcessor._model.transcribe(file_path)
        segments = [
            {
                "start": float(s["start"]),
                "end": float(s["end"]),
                "text": s["text"].strip(),
            }
            for s in result.get("segments", [])
        ]
        duration = segments[-1]["end"] if segments else 0.0
        return {
            "text": result.get("text", "").strip(),
            "segments": segments,
            "language": result.get("language", ""),
            "duration": duration,
        }
