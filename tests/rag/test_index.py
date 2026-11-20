import base64
import io
import unittest

from fastapi import HTTPException
from pypdf import PdfWriter
from pypdf.generic import DictionaryObject, NameObject, DecodedStreamObject
from services.rag.main import Corpus, Source, index, retrieve


class PolicyIndexTest(unittest.TestCase):
    def test_pdf_extraction_and_retrieval(self):
        writer = PdfWriter()
        page = writer.add_blank_page(width=500, height=500)
        font = DictionaryObject({NameObject("/Type"): NameObject("/Font"),
                                 NameObject("/Subtype"): NameObject("/Type1"),
                                 NameObject("/BaseFont"): NameObject("/Helvetica")})
        page[NameObject("/Resources")] = DictionaryObject(
            {NameObject("/Font"): DictionaryObject({NameObject("/F1"): font})})
        stream = DecodedStreamObject()
        stream.set_data(b"BT /F1 12 Tf 30 420 Td (Bicycles belong in the orchid courtyard.) Tj ET")
        page[NameObject("/Contents")] = writer._add_object(stream)
        pdf = io.BytesIO()
        writer.write(pdf)
        result = index(Source(title="Cycle parking", pdf=base64.b64encode(pdf.getvalue()).decode()))
        self.assertIn("orchid courtyard", result["text"])
        found = retrieve(Corpus(question="Where do bicycles belong?", documents=[
            {"id": "cycle", "title": "Cycle parking", "version": 1,
             "body": result["text"], "chunks": result["chunks"]}]))
        self.assertEqual(found[0]["id"], "cycle")

    def test_unreadable_pdf_is_rejected(self):
        with self.assertRaises(HTTPException):
            index(Source(title="Invalid file", pdf="bm90IGEgcGRm"))

