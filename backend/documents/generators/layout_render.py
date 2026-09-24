"""
Rendu des pages à positionnement libre (page de garde, page de suivi).

Une même *spec* de mise en page (coordonnées en points sur A4, origine en haut
à gauche) est rendue par un seul moteur (reportlab). On en produit :
  - une page PDF vectorielle (utilisée telle quelle dans le PDF final) ;
  - une image PNG haute résolution (insérée pleine page dans le Word).

Résultat : la page de garde / de suivi est **identique** en PDF et en Word,
avec les mêmes polices, positions, images (redimensionnables) et variables.

Format d'un élément (unités = points, 1 pt = 1/72") :
    {
      "id", "type": "text|image|logo|rect|line",
      "x", "y", "w", "h",
      # text : "text", "font", "size", "bold", "italic", "color", "align", "leading"
      # image : "asset_url", "fit": "contain|stretch"
      # rect : "fill", "stroke", "stroke_width", "radius"
      # line : "color", "width"
    }
"""
import io
import os
import subprocess
import tempfile

from django.conf import settings as dj_settings

from . import housestyle as HS
from .base import GenerationContext, interpolate, placeholder_context

A4_W, A4_H = 595.2755905511812, 841.8897637795277  # points
A3_W, A3_H = 841.8897637795277, 1190.551181102362   # points


def page_dims(layout):
    """Dimensions (points) selon page_size (a4/a3) et orientation de la mise en page."""
    size = (layout or {}).get("page_size", "a4")
    w, h = (A3_W, A3_H) if size == "a3" else (A4_W, A4_H)
    if (layout or {}).get("orientation") == "landscape":
        w, h = h, w
    return w, h

FONT_MAP = {
    "title": "Montserrat-SemiBold",
    "subtitle": "Montserrat",
    "heading": "Montserrat-SemiBold",
    "body": "Roboto",
    "light": "Montserrat-Light",
}


def _hex(color, default="#000000"):
    from reportlab.lib.colors import HexColor
    try:
        c = str(color or default)
        if not c.startswith("#"):
            c = "#" + c
        return HexColor(c)
    except Exception:
        return HexColor(default)


def _resolve_asset(url):
    if not url:
        return None
    media_url = dj_settings.MEDIA_URL
    idx = url.find(media_url)
    rel = url[idx + len(media_url):] if idx >= 0 else url.lstrip("/")
    path = os.path.join(dj_settings.MEDIA_ROOT, rel)
    return path if os.path.exists(path) else None


def _logo_path(ctx):
    logo = getattr(ctx.company, "logo", None)
    try:
        if logo and logo.path and os.path.exists(logo.path):
            return logo.path
    except Exception:
        pass
    return None


def _font_name(key, bold=False, italic=False):
    base = FONT_MAP.get(key, "Roboto")
    if key == "body" and bold and HS.font_available("Roboto-Bold"):
        base = "Roboto-Bold"
    if not HS.font_available(base):
        base = "Helvetica"
    return base


def draw_on_canvas(c, layout, ctx, page_w=A4_W, page_h=A4_H):
    """Dessine tous les éléments de la mise en page sur un canvas reportlab."""
    from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
    from reportlab.lib.styles import ParagraphStyle
    from reportlab.lib.utils import ImageReader
    from reportlab.platypus import Frame, Paragraph

    HS.register_pdf_fonts()
    pctx = placeholder_context(ctx)

    # Fond
    bg = layout.get("background")
    if bg:
        c.setFillColor(_hex(bg))
        c.rect(0, 0, page_w, page_h, fill=1, stroke=0)

    for el in layout.get("elements", []):
        etype = el.get("type", "text")
        x = float(el.get("x", 0)); y = float(el.get("y", 0))
        w = float(el.get("w", 100)); h = float(el.get("h", 20))
        # origine haut-gauche -> reportlab bas-gauche
        ry = page_h - y - h

        if etype in ("image", "logo"):
            reader = None
            if etype == "logo":
                path = _logo_path(ctx)
                if path:
                    reader = ImageReader(path)
            else:
                url = el.get("asset_url") or ""
                if url.startswith("data:"):
                    try:
                        import base64
                        b64 = url.split(",", 1)[1]
                        reader = ImageReader(io.BytesIO(base64.b64decode(b64)))
                    except Exception:
                        reader = None
                else:
                    path = _resolve_asset(url)
                    if path:
                        reader = ImageReader(path)
            if reader is None:
                continue
            try:
                preserve = el.get("fit", "contain") != "stretch"
                c.drawImage(reader, x, ry, width=w, height=h,
                            preserveAspectRatio=preserve, anchor="c", mask="auto")
            except Exception:
                pass

        elif etype == "rect":
            c.saveState()
            if el.get("fill"):
                c.setFillColor(_hex(el["fill"]))
            sw = float(el.get("stroke_width", 0))
            if el.get("stroke") and sw:
                c.setStrokeColor(_hex(el["stroke"])); c.setLineWidth(sw)
            radius = float(el.get("radius", 0))
            fill = 1 if el.get("fill") else 0
            stroke = 1 if (el.get("stroke") and sw) else 0
            if radius:
                c.roundRect(x, ry, w, h, radius, fill=fill, stroke=stroke)
            else:
                c.rect(x, ry, w, h, fill=fill, stroke=stroke)
            c.restoreState()

        elif etype == "line":
            c.saveState()
            c.setStrokeColor(_hex(el.get("color", "#000000")))
            c.setLineWidth(float(el.get("width", 1)))
            c.line(x, page_h - y, x + w, page_h - y)
            c.restoreState()

        else:  # text
            text = interpolate(el.get("text", ""), pctx).replace("\n", "<br/>")
            size = float(el.get("size", 14))
            align = {"center": TA_CENTER, "right": TA_RIGHT}.get(el.get("align"), TA_LEFT)
            font = _font_name(el.get("font", "body"), el.get("bold"), el.get("italic"))
            style = ParagraphStyle(
                "el", fontName=font, fontSize=size,
                leading=float(el.get("leading", size * 1.25)),
                textColor=_hex(el.get("color", "#000000")), alignment=align)
            # gras simulé si police sans variante bold explicite
            if el.get("bold") and font not in ("Roboto-Bold", "Montserrat-SemiBold",
                                               "Helvetica-Bold"):
                text = f"<b>{text}</b>"
            if el.get("italic"):
                text = f"<i>{text}</i>"
            frame = Frame(x, ry, w, h, leftPadding=0, rightPadding=0,
                          topPadding=0, bottomPadding=0, showBoundary=0)
            frame.addFromList([Paragraph(text, style)], c)


def render_pdf_page_bytes(layout, ctx, page_w=A4_W, page_h=A4_H) -> bytes:
    """Produit une page PDF A4 unique contenant la mise en page."""
    from reportlab.pdfgen import canvas as pdfcanvas
    buffer = io.BytesIO()
    c = pdfcanvas.Canvas(buffer, pagesize=(page_w, page_h))
    draw_on_canvas(c, layout, ctx, page_w, page_h)
    c.showPage()
    c.save()
    return buffer.getvalue()


def _lay_font(key, bold=False, size=20):
    from PIL import ImageFont
    fmap = {"title": "Montserrat-SemiBold.ttf", "subtitle": "Montserrat-Regular.ttf",
            "heading": "Montserrat-SemiBold.ttf", "body": "Roboto-Regular.ttf",
            "light": "Montserrat-Light.ttf"}
    fname = fmap.get(key, "Roboto-Regular.ttf")
    if bold and key == "body":
        fname = "Roboto-Bold.ttf"
    try:
        return ImageFont.truetype(os.path.join(HS.FONTS_DIR, fname), size)
    except Exception:
        try:
            return ImageFont.truetype(os.path.join(HS.FONTS_DIR, "Roboto-Regular.ttf"), size)
        except Exception:
            return ImageFont.load_default()


def _rgb_pil(color, default=(0, 0, 0)):
    try:
        h = str(color or "").lstrip("#")
        if len(h) == 3:
            h = "".join(c * 2 for c in h)
        return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16))
    except Exception:
        return default


def render_png(layout, ctx, dpi=150):
    """Rastérise la mise en page en PNG avec Pillow (portable, sans poppler).

    Renvoie (bytes, w_px, h_px). Coordonnées de la spec en points (A4/A3).
    """
    from PIL import Image, ImageDraw

    pctx = placeholder_context(ctx)
    pw_pt, ph_pt = page_dims(layout)
    scale = dpi / 72.0
    W, H = int(round(pw_pt * scale)), int(round(ph_pt * scale))

    bg = layout.get("background") or "#FFFFFF"
    img = Image.new("RGB", (W, H), _rgb_pil(bg, (255, 255, 255)))
    d = ImageDraw.Draw(img)

    def sx(v):
        return int(round(float(v) * scale))

    for el in layout.get("elements", []):
        etype = el.get("type", "text")
        x, y = sx(el.get("x", 0)), sx(el.get("y", 0))
        w, h = sx(el.get("w", 100)), sx(el.get("h", 20))

        if etype in ("image", "logo"):
            src = None
            if etype == "logo":
                p = _logo_path(ctx)
                if p:
                    src = p
            else:
                url = el.get("asset_url") or ""
                if url.startswith("data:"):
                    try:
                        import base64
                        src = io.BytesIO(base64.b64decode(url.split(",", 1)[1]))
                    except Exception:
                        src = None
                else:
                    src = _resolve_asset(url)
            if src is None:
                continue
            try:
                im = Image.open(src).convert("RGBA")
                if el.get("fit", "contain") == "stretch":
                    im = im.resize((max(1, w), max(1, h)))
                else:
                    im.thumbnail((max(1, w), max(1, h)))
                ox = x + (w - im.width) // 2
                oy = y + (h - im.height) // 2
                img.paste(im, (ox, oy), im)
            except Exception:
                pass

        elif etype == "rect":
            fill = _rgb_pil(el["fill"]) if el.get("fill") else None
            outline = _rgb_pil(el["stroke"]) if el.get("stroke") else None
            sw = sx(el.get("stroke_width", 0)) or (2 if outline else 0)
            radius = sx(el.get("radius", 0))
            box = [x, y, x + w, y + h]
            if radius:
                d.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=sw or 1)
            else:
                d.rectangle(box, fill=fill, outline=outline, width=sw or 1)

        elif etype == "line":
            d.line([(x, y), (x + w, y)], fill=_rgb_pil(el.get("color", "#000000")),
                   width=sx(el.get("width", 1)) or 1)

        else:  # text
            text = interpolate(el.get("text", ""), pctx)
            size = sx(el.get("size", 14))
            font = _lay_font(el.get("font", "body"), el.get("bold"), max(6, size))
            fill = _rgb_pil(el.get("color", "#000000"))
            align = el.get("align", "left")
            # retour à la ligne + gestion des \n
            lines = []
            for raw in text.split("\n"):
                words = raw.split()
                cur = ""
                for word in words:
                    trial = (cur + " " + word).strip()
                    if d.textlength(trial, font=font) <= w or not cur:
                        cur = trial
                    else:
                        lines.append(cur); cur = word
                lines.append(cur)
            asc, desc = font.getmetrics()
            lh = (asc + desc) * 1.2
            cy = y
            for ln in lines:
                tw = d.textlength(ln, font=font)
                if align == "center":
                    tx = x + (w - tw) / 2
                elif align == "right":
                    tx = x + w - tw
                else:
                    tx = x
                d.text((tx, cy), ln, font=font, fill=fill)
                cy += lh

    buf = io.BytesIO()
    img.save(buf, "PNG")
    return buf.getvalue(), img.width, img.height


def has_layout(ctx, key):
    layouts = (ctx.document.template.settings or {}).get("layouts") or {}
    layout = layouts.get(key)
    return bool(layout and layout.get("elements"))


def get_layout(ctx, key):
    return ((ctx.document.template.settings or {}).get("layouts") or {}).get(key)
