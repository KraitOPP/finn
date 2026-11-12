
"""In-memory fictional PDFs cover layout, scans, invalid input and encryption."""
import importlib.util
import io
import pathlib
import unittest

from pypdf import PdfWriter
from pypdf.generic import DecodedStreamObject, DictionaryObject, NameObject

SCRIPT = pathlib.Path(__file__).resolve().parents[1] / "extract.py"
SPEC = importlib.util.spec_from_file_location("finn_pdf_extract", SCRIPT)
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


def sample(text=True, encrypted=False):
    writer = PdfWriter()
    page = writer.add_blank_page(width=612, height=792)
    if text:
        page[NameObject("/Resources")] = DictionaryObject({
            NameObject("/Font"): DictionaryObject({
                NameObject("/F1"): DictionaryObject({
                    NameObject("/Type"): NameObject("/Font"),
                    NameObject("/Subtype"): NameObject("/Type1"),
                    NameObject("/BaseFont"): NameObject("/Helvetica"),
                }),
            }),
        })
        stream = DecodedStreamObject()
        stream.set_data(b"BT /F1 12 Tf 72 720 Td (Fictional revenue 125) Tj ET")
        page[NameObject("/Contents")] = writer._add_object(stream)
    else:
        # An image-only page has no text. The single pixel is fictional fixture data.
        image = DecodedStreamObject()
        from pypdf.generic import NumberObject
        image.update({
            NameObject("/Type"): NameObject("/XObject"), NameObject("/Subtype"): NameObject("/Image"),
            NameObject("/Width"): NumberObject(1), NameObject("/Height"): NumberObject(1),
            NameObject("/BitsPerComponent"): NumberObject(8), NameObject("/ColorSpace"): NameObject("/DeviceGray"),
        })
        image.set_data(bytes([255]))
        page[NameObject("/Resources")] = DictionaryObject({
            NameObject("/XObject"): DictionaryObject({NameObject("/Im1"): writer._add_object(image)})
        })
        stream = DecodedStreamObject()
        stream.set_data(b"q 200 0 0 200 72 500 cm /Im1 Do Q")
        page[NameObject("/Contents")] = writer._add_object(stream)
    if encrypted:
        writer.encrypt("fictional fixture password")
    result = io.BytesIO()
    writer.write(result)
    return result.getvalue()


class ExtractTests(unittest.TestCase):
    def test_text_carries_page_number(self):
        result = MODULE.extract(sample())
        self.assertEqual(result["total"], 1)
        self.assertEqual(result["pages"][0]["number"], 1)
        self.assertIn("Fictional revenue 125", result["pages"][0]["text"])

    def test_image_only_page_has_no_fabricated_text(self):
        result = MODULE.extract(sample(text=False))
        self.assertEqual(result["pages"], [{"number": 1, "state": "NO_TEXT", "text": ""}])

    def test_encrypted_and_malformed(self):
        self.assertEqual(MODULE.extract(sample(encrypted=True))["code"], "ENCRYPTED_PDF")
        self.assertEqual(MODULE.extract(b"%PDF-1.4\n%%EOF")["code"], "MALFORMED_PDF")

    def test_page_limit_keeps_original_total(self):
        writer = PdfWriter()
        for _ in range(21):
            writer.add_blank_page(width=72, height=72)
        out = io.BytesIO()
        writer.write(out)
        result = MODULE.extract(out.getvalue())
        self.assertEqual((result["total"], len(result["pages"])), (21, 20))
