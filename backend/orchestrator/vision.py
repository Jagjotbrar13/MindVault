import base64

from utils.ollama_client import OllamaClient


class VisionModel:
    def __init__(self, client: OllamaClient | None = None) -> None:
        self.client = client or OllamaClient()

    async def describe_image(self, image_path: str, query: str | None = None) -> str:
        with open(image_path, "rb") as image_file:
            encoded = base64.b64encode(image_file.read()).decode("utf-8")
        prompt = query or "Describe this image in detail for a private knowledge base."
        messages = [{"role": "user", "content": prompt, "images": [encoded]}]
        return str(await self.client.chat("llava:7b", messages))
