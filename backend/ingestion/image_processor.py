from PIL import Image

from orchestrator.vision import VisionModel


class ImageProcessor:
    def __init__(self) -> None:
        self.vision = VisionModel()

    async def process(self, file_path: str) -> dict:
        with Image.open(file_path) as image:
            metadata = {
                "width": image.width,
                "height": image.height,
                "format": image.format or "",
                "mode": image.mode,
            }
        description = await self.vision.describe_image(file_path)
        return {
            "description": description,
            "text": description,
            "metadata": metadata,
            "file_path": file_path,
        }
