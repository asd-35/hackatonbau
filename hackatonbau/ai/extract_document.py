"""CLI document text extraction for the Express evidence service.
Optional: pip install pypdf python-docx extract-msg
"""
import sys
from pathlib import Path


def extract(file_path):
    path = Path(file_path)
    ext = path.suffix.lower()
    if ext == ".pdf":
        from pypdf import PdfReader
        reader = PdfReader(str(path))
        return "\n".join(page.extract_text() or "" for page in reader.pages[:30])
    if ext == ".docx":
        from docx import Document
        doc = Document(str(path))
        return "\n".join([p.text for p in doc.paragraphs] + [" | ".join(cell.text for cell in row.cells) for table in doc.tables for row in table.rows])
    if ext == ".msg":
        import extract_msg
        msg = extract_msg.Message(str(path))
        return "\n".join([f"Subject: {msg.subject}", f"From: {msg.sender}", msg.body or ""])
    return ""

if __name__ == "__main__":
    print(extract(sys.argv[1])[:100000])
