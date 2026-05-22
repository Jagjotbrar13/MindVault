from pathlib import Path

import fitz


class PDFProcessor:
    def __init__(self, image_dir: str = "storage/images") -> None:
        self.image_dir = Path(image_dir)
        self.image_dir.mkdir(parents=True, exist_ok=True)

    def process(self, file_path: str) -> dict:
        document = fitz.open(file_path)
        pages: list[str] = []
        images: list[str] = []
        for page_index, page in enumerate(document):
            pages.append(page.get_text())
            for image_index, image in enumerate(page.get_images(full=True)):
                xref = image[0]
                pix = fitz.Pixmap(document, xref)
                if pix.n - pix.alpha > 3:
                    pix = fitz.Pixmap(fitz.csRGB, pix)
                path = (
                    self.image_dir
                    / f"{Path(file_path).stem}_p{page_index + 1}_{image_index + 1}.png"
                )
                pix.save(path)
                images.append(str(path))
        metadata = document.metadata or {}
        metadata["pages"] = document.page_count
        return {
            "text": "\n".join(pages),
            "pages": pages,
            "images": images,
            "metadata": metadata,
        }
