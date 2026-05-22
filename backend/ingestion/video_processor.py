import tempfile
from pathlib import Path

import ffmpeg

from ingestion.audio_processor import AudioProcessor


class VideoProcessor:
    def __init__(self, thumbnail_dir: str = "storage/thumbnails") -> None:
        self.thumbnail_dir = Path(thumbnail_dir)
        self.thumbnail_dir.mkdir(parents=True, exist_ok=True)
        self.audio = AudioProcessor()

    async def process(self, file_path: str) -> dict:
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as wav:
            wav_path = wav.name
        ffmpeg.input(file_path).output(wav_path, ac=1, ar=16000).overwrite_output().run(
            quiet=True
        )
        transcript = await self.audio.process(wav_path)
        pattern = str(self.thumbnail_dir / f"{Path(file_path).stem}_%03d.jpg")
        ffmpeg.input(file_path).filter("fps", fps="1/60").output(
            pattern, qscale=3
        ).overwrite_output().run(quiet=True)
        thumbnails = [
            str(path)
            for path in self.thumbnail_dir.glob(f"{Path(file_path).stem}_*.jpg")
        ]
        return transcript | {"thumbnails": thumbnails}
