
"""Read one uploaded PDF from stdin and return bounded, page-indexed text."""
import io
import json
import logging
import os
import sys
import unicodedata

MAX_INPUT = 3 * 1024 * 1024
MAX_PAGES = 20
MAX_PAGE_CHARS = 12000
MAX_CHARS = 60000


def extract(data):
    from pypdf import PdfReader

    if not data.startswith(b"%PDF-") or len(data) > MAX_INPUT:
        return {"code": "MALFORMED_PDF", "total": 0, "pages": []}
    try:
        reader = PdfReader(io.BytesIO(data), strict=True)
        if reader.is_encrypted:
            return {"code": "ENCRYPTED_PDF", "total": 0, "pages": []}
        total = len(reader.pages)
        if not 0 < total <= 10000:
            return {"code": "PDF_PAGE_LIMIT", "total": 0, "pages": []}
    except Exception:
        return {"code": "MALFORMED_PDF", "total": 0, "pages": []}

    pages = []
    remaining = MAX_CHARS
    for number in range(min(total, MAX_PAGES)):
        if remaining == 0:
            break
        try:
            text = reader.pages[number].extract_text(extraction_mode="layout") or ""
        except Exception:
            pages.append({"number": number + 1, "state": "UNREADABLE", "text": ""})
            continue
        text = text.replace("\r\n", "\n").replace("\r", "\n")
        text = "".join(
            " " if unicodedata.category(char) in {"Cc", "Cf", "Cs"} and char not in "\n\t" else char
            for char in text
        )
        limit = min(MAX_PAGE_CHARS, remaining)
        state = "TRUNCATED" if len(text) > limit else "TEXT" if text.strip() else "NO_TEXT"
        text = text[:limit]
        if state == "NO_TEXT":
            text = ""
        remaining -= len(text)
        pages.append({"number": number + 1, "state": state, "text": text})
    return {"code": "OK", "total": total, "pages": pages}


def main():
    logging.disable(logging.CRITICAL)
    if os.name == "posix":
        import resource
        resource.setrlimit(resource.RLIMIT_AS, (384 * 1024 * 1024, 384 * 1024 * 1024))
    data = sys.stdin.buffer.read(MAX_INPUT + 1)
    result = extract(data)
    sys.stdout.buffer.write(json.dumps(result, ensure_ascii=False, separators=(",", ":")).encode("utf-8"))


if __name__ == "__main__":
    main()
