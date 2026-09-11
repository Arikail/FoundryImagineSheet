#!/usr/bin/env python3
"""
extract_book_text.py -- pull the text layer out of a rulebook PDF.

Build-time tooling. Not shipped with the Foundry system.

The extracted text is deliberately NOT committed -- see .gitignore. This repository is
public, and permission to build a Foundry conversion is not permission to republish the
books. Run this locally against your own copies when you need them.

The scans carry an OCR text layer, so this reads rather than re-OCRs. Expect the usual OCR
noise: a backtick where an apostrophe belongs, ligatures run together, the odd mangled table.
Good enough to search and quote from, not good enough to trust blindly over his code.

Usage:
    python extract_book_text.py "C:/path/IRP_playersguide.pdf" players-guide
    python extract_book_text.py "C:/path/IRP_mastersmanual_scan.pdf" masters-manual

Writes docs/reference/<name>-fulltext.txt with page markers, so a hit can be traced back to
a page in the printed book.
"""

import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
REFERENCE = os.path.join(HERE, "..", "..", "docs", "reference")


def main():
    if len(sys.argv) != 3:
        print(__doc__)
        return 1

    pdfpath, name = sys.argv[1], sys.argv[2]
    if not os.path.exists(pdfpath):
        print("no such file: %s" % pdfpath)
        return 1

    try:
        import pymupdf
    except ImportError:
        try:
            import fitz as pymupdf
        except ImportError:
            print("PyMuPDF is needed:  python -m pip install pymupdf")
            return 1

    os.makedirs(REFERENCE, exist_ok=True)
    outpath = os.path.join(REFERENCE, "%s-fulltext.txt" % name)

    doc = pymupdf.open(pdfpath)
    with open(outpath, "w", encoding="utf-8") as fh:
        for i in range(doc.page_count):
            fh.write("\n===== PAGE %d =====\n" % (i + 1))
            fh.write(doc[i].get_text())
    pages = doc.page_count
    doc.close()

    print("wrote %s (%d pages, %d KB)" % (
        os.path.relpath(outpath, os.path.join(HERE, "..", "..")),
        pages, os.path.getsize(outpath) // 1024))
    return 0


if __name__ == "__main__":
    sys.exit(main())
