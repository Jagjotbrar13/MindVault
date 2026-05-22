import re
import uuid
from pathlib import Path

from playwright.async_api import Page, async_playwright


class URLProcessor:
    def __init__(self, screenshot_dir: str = "storage/screenshots") -> None:
        self.screenshot_dir = Path(screenshot_dir)
        self.screenshot_dir.mkdir(parents=True, exist_ok=True)

    async def process(self, url: str) -> dict:
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            try:
                page = await browser.new_page()
                await page.goto(url, wait_until="networkidle", timeout=45000)
                title = await page.title()
                description = await self._meta_description(page)
                text = await self._main_text(page)
                screenshot_path = self.screenshot_dir / f"{uuid.uuid4()}.png"
                await page.screenshot(path=str(screenshot_path), full_page=True)
            finally:
                await browser.close()
        text = re.sub(r"\n{3,}", "\n\n", text).strip()
        return {
            "text": text,
            "title": title or url,
            "url": url,
            "screenshot_path": str(screenshot_path),
            "metadata": {"description": description},
        }

    async def _meta_description(self, page: Page) -> str:
        try:
            return (
                await page.locator("meta[name='description']").get_attribute(
                    "content", timeout=1500
                )
                or ""
            )
        except Exception:
            return ""

    async def _main_text(self, page: Page) -> str:
        await page.evaluate(
            """() => {
                const selectors = [
                    'nav', 'footer', 'aside', 'script', 'style', 'noscript',
                    '[role="navigation"]', '[role="banner"]', '[role="contentinfo"]',
                    '[aria-label*="advertisement" i]', '.ad', '.ads', '.advertisement',
                    '.cookie', '.cookies', '.newsletter', '.subscribe'
                ];
                selectors.forEach((selector) => {
                    document.querySelectorAll(selector).forEach((node) => node.remove());
                });
            }"""
        )
        selectors = ["main", "article", '[role="main"]', ".content", "#content", "body"]
        for selector in selectors:
            try:
                text = await page.locator(selector).first.inner_text(timeout=3000)
                if text and len(text.strip()) > 80:
                    return text
            except Exception:
                continue
        return await page.locator("body").inner_text()
