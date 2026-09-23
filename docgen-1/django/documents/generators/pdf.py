"""PDF generator with absolute positioning.

Template ``config`` shape::

    {
      "page_width": 595, "page_height": 842,   # points (A4 default)
      "fields": [
        {"type": "text",     "x": 50, "y": 60, "size": 12, "value": "Devis"},
        {"type": "variable", "x": 50, "y": 90, "size": 11, "variable": "client.name"},
        {"type": "image",    "x": 400, "y": 40, "w": 120, "h": 60, "source": "company_logo"},
        {"type": "form_field","x": 50, "y": 200, "w": 200, "h": 18, "name": "signature"},
        {"type": "checkbox",  "x": 50, "y": 240, "name": "accept", "checked": false}
      ]
    }

Coordinates are top-left origin (like the visual editor); this module flips
them to reportlab's bottom-left origin.
"""
import io

from django.conf import settings
from reportlab.lib.colors import HexColor
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader
from pypdf import PdfReader, PdfWriter

from documents.context import build_context, resolve


def _image_source(source, ctx, document):
    from core.models import Company
    company = Company.get_solo()
    if source == "company_logo" and company.logo:
        return company.logo.path
    if source == "project_logo" and document.project and document.project.logo:
        return document.project.logo.path
    # Otherwise treat it as a variable holding an absolute path/URL.
    return ctx.get(source)


def generate_pdf(document, context=None):
    cfg = document.template.config or {}
    ctx = build_context(document)

    pw = cfg.get("page_width", settings.PDF_PAGE_WIDTH_PT)
    ph = cfg.get("page_height", settings.PDF_PAGE_HEIGHT_PT)

    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=(pw, ph))
    form = c.acroForm

    # Optional background image spanning the page.
    tpl = document.template
    if tpl.background_image:
        try:
            c.drawImage(tpl.background_image.path, 0, 0, width=pw, height=ph,
                        preserveAspectRatio=False, mask="auto")
        except Exception:
            pass

    for field in cfg.get("fields", []):
        ftype = field.get("type", "text")
        x = float(field.get("x", 0))
        # Flip Y: editor uses top-left, PDF uses bottom-left.
        y = ph - float(field.get("y", 0))
        size = float(field.get("size", 11))
        color = field.get("color", "#111111")

        if ftype in ("text", "variable"):
            raw = field.get("value") if ftype == "text" else \
                "{{" + field.get("variable", "") + "}}"
            text = resolve(raw, ctx)
            c.setFont(field.get("font", "Helvetica"), size)
            c.setFillColor(HexColor(color))
            c.drawString(x, y - size, text)

        elif ftype == "image":
            w = float(field.get("w", 120))
            h = float(field.get("h", 60))
            src = _image_source(field.get("source", ""), ctx, document)
            if src:
                try:
                    c.drawImage(ImageReader(src), x, y - h, width=w, height=h,
                                preserveAspectRatio=True, mask="auto")
                except Exception:
                    pass

        elif ftype == "form_field":
            w = float(field.get("w", 200))
            h = float(field.get("h", 18))
            form.textfield(
                name=field.get("name", "field"),
                x=x, y=y - h, width=w, height=h,
                value=str(resolve(field.get("value", ""), ctx)),
                fontSize=size, borderWidth=1,
            )

        elif ftype == "checkbox":
            form.checkbox(
                name=field.get("name", "check"),
                x=x, y=y - 14, size=14,
                checked=bool(field.get("checked", False)),
            )

    # Confidentiality watermark for non-public documents.
    if document.confidentiality != "public":
        c.saveState()
        c.setFont("Helvetica-Bold", 8)
        c.setFillColor(HexColor("#999999"))
        c.drawString(20, 15, document.get_confidentiality_display().upper()
                     + f"  —  v{document.current_version + 1}")
        c.restoreState()

    c.showPage()
    c.save()
    buf.seek(0)

    # Merge onto a background PDF if provided.
    if tpl.background_pdf:
        try:
            bg = PdfReader(tpl.background_pdf.path)
            overlay = PdfReader(buf)
            writer = PdfWriter()
            base_page = bg.pages[0]
            base_page.merge_page(overlay.pages[0])
            writer.add_page(base_page)
            out = io.BytesIO()
            writer.write(out)
            out.seek(0)
            return f"{document.title}.pdf", out.read()
        except Exception:
            buf.seek(0)

    return f"{document.title}.pdf", buf.read()
