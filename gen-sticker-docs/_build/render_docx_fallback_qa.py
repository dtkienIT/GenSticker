"""Render manifest-equivalent DOCX content when LibreOffice is unavailable.

This is a visual QA fallback only. The Office artifact remains the DOCX built
by build_docx.py. ReportLab mirrors its content, figures, palette and A4 flow
so every page can still be inspected on Windows hosts without soffice.
"""

from __future__ import annotations

import argparse
import html
import json
from pathlib import Path

from pdf2image import convert_from_path
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    Image,
    KeepTogether,
    ListFlowable,
    ListItem,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "project-docs.json"
POPPLER = Path(
    r"C:\Users\PC\.cache\codex-runtimes\codex-primary-runtime\dependencies\native\poppler\Library\bin"
)

PRIMARY = colors.HexColor("#5B3DF5")
PRIMARY_DARK = colors.HexColor("#4338CA")
PINK = colors.HexColor("#DB2777")
INK = colors.HexColor("#0F172A")
MUTED = colors.HexColor("#475569")
LIGHT = colors.HexColor("#EEF2FF")
LIGHT_ALT = colors.HexColor("#F8FAFC")
BORDER = colors.HexColor("#CBD5E1")


def register_fonts() -> None:
    fonts = {
        "Arial": r"C:\Windows\Fonts\arial.ttf",
        "Arial-Bold": r"C:\Windows\Fonts\arialbd.ttf",
        "Arial-Italic": r"C:\Windows\Fonts\ariali.ttf",
    }
    for name, path in fonts.items():
        if Path(path).exists():
            pdfmetrics.registerFont(TTFont(name, path))


register_fonts()
STYLES = getSampleStyleSheet()
STYLES.add(ParagraphStyle(name="GSBody", parent=STYLES["BodyText"], fontName="Arial", fontSize=9.4, leading=13, textColor=INK, spaceAfter=6))
STYLES.add(ParagraphStyle(name="GSTitle", parent=STYLES["Title"], fontName="Arial-Bold", fontSize=27, leading=31, textColor=INK, spaceAfter=7))
STYLES.add(ParagraphStyle(name="GSSubtitle", parent=STYLES["BodyText"], fontName="Arial", fontSize=13, leading=18, textColor=MUTED, spaceAfter=12))
STYLES.add(ParagraphStyle(name="GSH1", parent=STYLES["Heading1"], fontName="Arial-Bold", fontSize=16, leading=20, textColor=INK, spaceBefore=13, spaceAfter=7, keepWithNext=True))
STYLES.add(ParagraphStyle(name="GSCaption", parent=STYLES["BodyText"], fontName="Arial-Italic", fontSize=7.8, leading=10, textColor=MUTED, alignment=1, spaceAfter=5))
STYLES.add(ParagraphStyle(name="GSSource", parent=STYLES["BodyText"], fontName="Arial", fontSize=7, leading=9, textColor=MUTED, alignment=1, spaceAfter=8))
STYLES.add(ParagraphStyle(name="GSCell", parent=STYLES["BodyText"], fontName="Arial", fontSize=7.8, leading=10, textColor=INK))
STYLES.add(ParagraphStyle(name="GSCellHead", parent=STYLES["BodyText"], fontName="Arial-Bold", fontSize=8, leading=10, textColor=colors.white))
STYLES.add(ParagraphStyle(name="GSBullet", parent=STYLES["BodyText"], fontName="Arial", fontSize=9.2, leading=12.6, textColor=INK))


def e(value: object) -> str:
    return html.escape(str(value), quote=True)


def qa_table(headers: list[str], rows: list[list[object]], width: float) -> Table:
    data = [[Paragraph(e(value), STYLES["GSCellHead"]) for value in headers]]
    data.extend([[Paragraph(e(value), STYLES["GSCell"]) for value in row] for row in rows])
    column_width = width / max(1, len(headers))
    table = Table(data, colWidths=[column_width] * len(headers), repeatRows=1, hAlign="LEFT")
    style = [
        ("BACKGROUND", (0, 0), (-1, 0), PRIMARY_DARK),
        ("GRID", (0, 0), (-1, -1), 0.45, BORDER),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]
    for row_index in range(2, len(data), 2):
        style.append(("BACKGROUND", (0, row_index), (-1, row_index), LIGHT_ALT))
    table.setStyle(TableStyle(style))
    return table


def section_story(section: dict, width: float) -> list:
    story = [Paragraph(e(section["title"]), STYLES["GSH1"])]
    section_type = section["type"]
    if section_type == "paragraphs":
        story.extend(Paragraph(e(value), STYLES["GSBody"]) for value in section.get("paragraphs", []))
    elif section_type == "bullets":
        story.append(ListFlowable(
            [ListItem(Paragraph(e(value), STYLES["GSBullet"]), leftIndent=9) for value in section.get("bullets", [])],
            bulletType="bullet",
            leftIndent=18,
            bulletFontName="Arial",
            bulletFontSize=8,
            spaceAfter=8,
        ))
    elif section_type == "table":
        story.append(qa_table(section["headers"], section["rows"], width))
        story.append(Spacer(1, 6))
    elif section_type == "sources":
        story.append(ListFlowable(
            [ListItem(Paragraph(e(value), STYLES["GSBullet"]), leftIndent=9) for value in section.get("sources", [])],
            bulletType="bullet",
            leftIndent=18,
            spaceAfter=8,
        ))
    return story


def figure_story(figure: dict, document: dict, number: int, width: float) -> list:
    image = Image(str(ROOT / figure["png"]), width=width, height=width * 9 / 16)
    caption = Paragraph(
        f"Hình GS-DOC-{e(document['number'])}.{number} — {e(figure['title'])}. {e(figure['caption'])}",
        STYLES["GSCaption"],
    )
    description_data = [[Paragraph(
        f"<b>Mô tả sơ đồ:</b> {e(figure['alt'])}", STYLES["GSCell"]
    )]]
    description = Table(description_data, colWidths=[width])
    description.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), LIGHT_ALT),
        ("BOX", (0, 0), (-1, -1), 0.5, BORDER),
        ("LEFTPADDING", (0, 0), (-1, -1), 7),
        ("RIGHTPADDING", (0, 0), (-1, -1), 7),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    refs = "; ".join(figure.get("sourceRefs", []))
    source = Paragraph(f"Nguồn: {e(refs)} · baseline kien_v5", STYLES["GSSource"])
    return [KeepTogether([Spacer(1, 8), image, caption, description, Spacer(1, 4), source])]


def page_decorator(document: dict, meta: dict):
    def draw(canvas, doc) -> None:
        page_width, page_height = A4
        canvas.saveState()
        canvas.setFillColor(PRIMARY_DARK)
        canvas.roundRect(18 * mm, page_height - 14 * mm, page_width - 36 * mm, 7 * mm, 2 * mm, fill=1, stroke=0)
        canvas.setFillColor(colors.white)
        canvas.setFont("Arial-Bold", 7.5)
        canvas.drawString(21 * mm, page_height - 9.7 * mm, "GENSTICKER / PROJECT DOCUMENTATION")
        canvas.drawRightString(page_width - 21 * mm, page_height - 9.7 * mm, f"GS-DOC-{document['number']}")
        canvas.setFillColor(MUTED)
        canvas.setFont("Arial", 7)
        canvas.drawString(
            19 * mm,
            9 * mm,
            f"{meta['branch']} @ {meta['commit']} · {meta['verifiedAt']}",
        )
        canvas.setFont("Arial-Bold", 7)
        canvas.drawRightString(page_width - 19 * mm, 9 * mm, f"TRANG {doc.page}")
        canvas.restoreState()
    return draw


def render_document(document: dict, figures: dict, meta: dict, output_root: Path) -> int:
    document_dir = output_root / f"{document['number']}-{document['id']}"
    document_dir.mkdir(parents=True, exist_ok=True)
    pdf_path = document_dir / "qa.pdf"
    doc = SimpleDocTemplate(
        str(pdf_path),
        pagesize=A4,
        leftMargin=19 * mm,
        rightMargin=19 * mm,
        topMargin=18 * mm,
        bottomMargin=17 * mm,
        title=document["title"],
        author="GenSticker project team",
    )
    width = A4[0] - 38 * mm
    visuals: dict[str, list[dict]] = {}
    for visual in document.get("visuals", []):
        if visual.get("afterSection"):
            visuals.setdefault(visual["afterSection"], []).append(visual)

    story = [
        Spacer(1, 12 * mm),
        Paragraph(f"GS-DOC-{e(document['number'])}", ParagraphStyle(name="Badge", parent=STYLES["GSBody"], fontName="Arial-Bold", fontSize=9, textColor=PRIMARY_DARK, backColor=LIGHT, borderPadding=8, spaceAfter=14)),
        Paragraph(e(document["title"]), STYLES["GSTitle"]),
        Paragraph(e(document["subtitle"]), STYLES["GSSubtitle"]),
        Table([["", ""]], colWidths=[width * 0.72, width * 0.28], rowHeights=[7], style=TableStyle([("BACKGROUND", (0, 0), (0, 0), PRIMARY), ("BACKGROUND", (1, 0), (1, 0), PINK)])),
        Spacer(1, 12),
        qa_table(["Control", "Value"], [["Phiên bản", meta["version"]], ["Baseline", f"{meta['branch']} @ {meta['commit']}"], ["Trạng thái", document["status"]], ["Ngày kiểm tra", meta["verifiedAt"]], ["Nguồn nội dung", "Source hiện tại; mẫu chỉ cung cấp cấu trúc"]], width),
        Spacer(1, 10),
        Paragraph(e(document["summary"]), STYLES["GSBody"]),
        Paragraph("NỘI DUNG", STYLES["GSH1"]),
        ListFlowable([ListItem(Paragraph(e(section["title"]), STYLES["GSBullet"]), leftIndent=8) for section in document.get("sections", [])], bulletType="bullet", leftIndent=18),
        PageBreak(),
    ]

    figure_number = 1
    for section in document.get("sections", []):
        story.extend(section_story(section, width))
        for visual in visuals.get(section["title"], []):
            story.extend(figure_story(figures[visual["figureId"]], document, figure_number, width))
            figure_number += 1
    decorator = page_decorator(document, meta)
    doc.build(story, onFirstPage=decorator, onLaterPages=decorator)

    pages = convert_from_path(str(pdf_path), dpi=125, poppler_path=str(POPPLER))
    for index, page in enumerate(pages, start=1):
        page.save(document_dir / f"page-{index}.png", "PNG", optimize=True)
    return len(pages)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output-dir", required=True)
    args = parser.parse_args()
    output_root = Path(args.output_dir)
    payload = json.loads(MANIFEST.read_text(encoding="utf-8"))
    for document in payload["documents"]:
        if document["kind"] == "DOCX":
            count = render_document(document, payload["figures"], payload["meta"], output_root)
            print(f"{document['number']} {document['title']}: {count} QA pages")


if __name__ == "__main__":
    main()
