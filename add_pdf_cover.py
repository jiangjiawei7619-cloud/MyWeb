from __future__ import annotations

import os
import tempfile
from pathlib import Path

from pypdf import PdfWriter
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas


SOURCE_PDF = Path(r"C:\Users\PC1\Desktop\半成品.pdf")
OUTPUT_PDF = Path(r"C:\Users\PC1\Desktop\半成品_加封面.pdf")

TITLE_TEXT = "项目书"
SUBTITLE_TEXT = "半成品项目计划书"

STAFF_LINES = [
    "项目负责人：2025级经济与金融学院金融学3班蒋珈玮 2524313012",
    "团队成员：2025级经济与金融学院金融学2班鲁鉴伦 2524312015",
    "团队成员：2025级经济与金融学院金融学2班张植博 2524312028",
    "团队成员：2025级经济与金融学院金融学3班柯轩宇",
    "团队成员：2025级经济与金融学院金融学3班柯轩宇",
    "团队成员：2025级经济与金融学院金融学3班柯轩宇 2524313013",
]


def register_chinese_font() -> str:
    candidates = [
        (r"C:\Windows\Fonts\msyh.ttc", 0),
        (r"C:\Windows\Fonts\msyhbd.ttc", 0),
        (r"C:\Windows\Fonts\simhei.ttf", 0),
        (r"C:\Windows\Fonts\simsun.ttc", 0),
        (r"C:\Windows\Fonts\simkai.ttf", 0),
    ]
    for font_path, subfont_index in candidates:
        if not os.path.exists(font_path):
            continue
        try:
            font_name = f"CoverCN{subfont_index}"
            pdfmetrics.registerFont(TTFont(font_name, font_path, subfontIndex=subfont_index))
            return font_name
        except Exception:
            continue
    raise RuntimeError("未找到可用的中文字体（已尝试 msyh/simhei/simsun 等）。")


def make_cover_pdf(cover_path: Path, font_name: str) -> None:
    width, height = A4
    c = canvas.Canvas(str(cover_path), pagesize=A4)

    c.setFillColor(colors.HexColor("#F3F7FC"))
    c.rect(0, 0, width, height, fill=1, stroke=0)

    c.setFillColor(colors.HexColor("#0F4C81"))
    c.rect(0, height - 130, width, 130, fill=1, stroke=0)

    c.setStrokeColor(colors.HexColor("#1E6FA8"))
    c.setLineWidth(2)
    c.line(50, height - 210, width - 50, height - 210)

    c.setFillColor(colors.white)
    c.setFont(font_name, 42)
    c.drawCentredString(width / 2, height - 85, TITLE_TEXT)

    c.setFillColor(colors.HexColor("#1F3C5A"))
    c.setFont(font_name, 20)
    c.drawCentredString(width / 2, height - 190, SUBTITLE_TEXT)

    c.setFont(font_name, 14)
    c.setFillColor(colors.HexColor("#1A1A1A"))
    y = height - 280
    for line in STAFF_LINES:
        c.drawString(70, y, line)
        y -= 40

    c.setStrokeColor(colors.HexColor("#5A8BB5"))
    c.setLineWidth(1.5)
    c.line(70, 95, width - 70, 95)
    c.setFillColor(colors.HexColor("#4F6D8A"))
    c.setFont(font_name, 12)
    c.drawCentredString(width / 2, 72, "经济与金融学院")

    c.save()


def merge_cover_first(cover_pdf: Path, source_pdf: Path, output_pdf: Path) -> None:
    writer = PdfWriter()
    writer.append(str(cover_pdf))
    writer.append(str(source_pdf))
    with output_pdf.open("wb") as f:
        writer.write(f)


def main() -> None:
    if not SOURCE_PDF.exists():
        raise FileNotFoundError(f"源文件不存在：{SOURCE_PDF}")

    font_name = register_chinese_font()
    with tempfile.NamedTemporaryFile(prefix="pdf_cover_", suffix=".pdf", delete=False) as tf:
        cover_path = Path(tf.name)

    try:
        make_cover_pdf(cover_path, font_name)
        merge_cover_first(cover_path, SOURCE_PDF, OUTPUT_PDF)
    finally:
        if cover_path.exists():
            cover_path.unlink()

    print(f"SUCCESS: {OUTPUT_PDF}")
    print(f"FONT: {font_name}")
    print(f"TITLE: {TITLE_TEXT}")
    print(f"SUBTITLE: {SUBTITLE_TEXT}")


if __name__ == "__main__":
    main()
