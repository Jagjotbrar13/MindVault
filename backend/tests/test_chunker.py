from utils.chunker import chunk_text


def test_chunk_text_splits_on_sentence_boundaries() -> None:
    text = "Alpha is first. Beta is second. Gamma is third."
    chunks = chunk_text(text, chunk_size=28, overlap=0)

    assert chunks
    assert all(chunk.endswith((".", "!", "?")) for chunk in chunks)
    assert "Alpha is first." in chunks[0]


def test_chunk_text_returns_empty_for_blank_input() -> None:
    assert chunk_text("   \n\t  ") == []
