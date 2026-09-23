"""
Rendu de diagrammes de type « SmartArt » (Word) par un moteur unique (reportlab)
produisant une image PNG. L'image est insérée dans le Word ; comme le PDF est
l'export Word, le diagramme est **identique** en Word et en PDF.

Variantes inspirées des catégories SmartArt de Word :
  - ``process``    : étapes enchaînées par des flèches (horizontal) ;
  - ``list``       : liste de blocs empilés ;
  - ``cycle``      : cycle circulaire ;
  - ``hierarchy``  : organigramme (1 racine + enfants) ;
  - ``pyramid``    : pyramide à niveaux.

Un élément = {"title": "...", "text": "..."}.
"""
import io
import math

from . import housestyle as HS
from .base import interpolate, placeholder_context


def _hex(color, default="#1F497D"):
    from reportlab.lib.colors import HexColor
    try:
        c = str(color or default)
        return HexColor(c if c.startswith("#") else "#" + c)
    except Exception:
        return HexColor(default)


def _shade(hexstr, factor):
    h = str(hexstr or "1F497D").lstrip("#")
    if len(h) == 3:
        h = "".join(ch * 2 for ch in h)
    r, g, b = int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)
    if factor >= 0.5:
        t = (factor - 0.5) * 2
        r, g, b = [int(v + (255 - v) * t) for v in (r, g, b)]
    else:
        t = 1 - factor * 2
        r, g, b = [int(v * (1 - t)) for v in (r, g, b)]
    return f"#{r:02X}{g:02X}{b:02X}"


def _font(bold=True):
    if bold and HS.font_available("Montserrat-SemiBold"):
        return "Montserrat-SemiBold"
    if HS.font_available("Roboto"):
        return "Roboto"
    return "Helvetica-Bold" if bold else "Helvetica"


def _wrap(c, text, font, size, max_w):
    from reportlab.pdfbase.pdfmetrics import stringWidth
    words = text.split()
    lines, cur = [], ""
    for w in words:
        trial = (cur + " " + w).strip()
        if stringWidth(trial, font, size) <= max_w or not cur:
            cur = trial
        else:
            lines.append(cur); cur = w
    if cur:
        lines.append(cur)
    return lines or [""]


def _draw_text(c, text, cx, cy, font, size, color, max_w, max_lines=4):
    lines = _wrap(c, text, font, size, max_w)[:max_lines]
    c.setFont(font, size); c.setFillColor(_hex(color))
    total_h = len(lines) * size * 1.2
    y = cy + total_h / 2 - size
    for ln in lines:
        c.drawCentredString(cx, y, ln)
        y -= size * 1.2


def render_png(block, ctx, width_px=1400, color="1F497D"):
    """Rend le diagramme en PNG (bytes, w, h)."""
    from reportlab.pdfgen import canvas as pdfcanvas

    HS.register_pdf_fonts()
    pctx = placeholder_context(ctx)
    variant = block.get("variant", "process")
    items = [{"title": interpolate(str(it.get("title", "")), pctx),
              "text": interpolate(str(it.get("text", "")), pctx)}
             for it in (block.get("diagram_items") or block.get("items") or []) if it]
    if not items:
        items = [{"title": "Élément", "text": ""}]
    color = block.get("color") or color

    scale = 2  # rendu 2x pour la netteté
    W = width_px
    tfont, bfont = _font(True), _font(False)

    def canvas_for(height):
        buf = io.BytesIO()
        c = pdfcanvas.Canvas(buf, pagesize=(W, height))
        return buf, c

    if variant == "process":
        n = len(items)
        gap = 22 * scale
        arrow = 26 * scale
        box_w = (W - (n - 1) * (gap + arrow)) / n
        box_h = 120 * scale
        H = box_h + 20 * scale
        buf, c = canvas_for(H)
        x = 0
        for i, it in enumerate(items):
            fill = _shade(color, 0.5 + (i % 3) * 0.12)
            c.setFillColor(_hex(fill)); c.roundRect(x, 10 * scale, box_w, box_h, 10 * scale, fill=1, stroke=0)
            _draw_text(c, it["title"], x + box_w / 2, 10 * scale + box_h * 0.62,
                       tfont, 15 * scale, "#FFFFFF", box_w - 20 * scale, 2)
            if it["text"]:
                _draw_text(c, it["text"], x + box_w / 2, 10 * scale + box_h * 0.28,
                           bfont, 11 * scale, "#EAF0F8", box_w - 20 * scale, 2)
            x += box_w
            if i < n - 1:
                ay = 10 * scale + box_h / 2
                c.setFillColor(_hex(color))
                c.setStrokeColor(_hex(color)); c.setLineWidth(6 * scale)
                c.line(x + gap / 2, ay, x + gap + arrow - 6 * scale, ay)
                p = c.beginPath(); tip = x + gap + arrow
                p.moveTo(tip, ay); p.lineTo(tip - 12 * scale, ay + 9 * scale)
                p.lineTo(tip - 12 * scale, ay - 9 * scale); p.close()
                c.drawPath(p, fill=1, stroke=0)
                x += gap + arrow

    elif variant == "list":
        n = len(items)
        box_h = 70 * scale
        gap = 12 * scale
        H = n * (box_h + gap) + gap
        buf, c = canvas_for(H)
        y = H - gap - box_h
        for i, it in enumerate(items):
            fill = _shade(color, 0.5 + (i % 3) * 0.12)
            c.setFillColor(_hex(fill)); c.roundRect(0, y, W, box_h, 8 * scale, fill=1, stroke=0)
            c.setFillColor(_hex("#FFFFFF"))
            c.setFont(tfont, 15 * scale)
            c.drawString(24 * scale, y + box_h - 28 * scale, it["title"])
            if it["text"]:
                c.setFont(bfont, 11 * scale); c.setFillColor(_hex("#EAF0F8"))
                c.drawString(24 * scale, y + 16 * scale, it["text"][:120])
            y -= box_h + gap

    elif variant == "cycle":
        n = len(items)
        H = W
        buf, c = canvas_for(H)
        cx, cy = W / 2, H / 2
        R = min(W, H) * 0.34
        node = min(W, H) * 0.16
        for i in range(n):
            ang = math.pi / 2 - i * 2 * math.pi / n
            x = cx + R * math.cos(ang); y = cy + R * math.sin(ang)
            fill = _shade(color, 0.5 + (i % 3) * 0.12)
            c.setFillColor(_hex(fill)); c.circle(x, y, node, fill=1, stroke=0)
            _draw_text(c, items[i]["title"], x, y, tfont, 13 * scale, "#FFFFFF", node * 1.7, 3)
        c.setStrokeColor(_hex(color)); c.setLineWidth(5 * scale)
        for i in range(n):
            a1 = math.pi / 2 - i * 2 * math.pi / n
            a2 = math.pi / 2 - (i + 1) * 2 * math.pi / n
            x1 = cx + R * math.cos(a1); y1 = cy + R * math.sin(a1)
            x2 = cx + R * math.cos(a2); y2 = cy + R * math.sin(a2)
            c.line(x1, y1, x2, y2)

    elif variant == "hierarchy":
        root = items[0]
        children = items[1:] or []
        H = 260 * scale
        buf, c = canvas_for(H)
        rw, rh = W * 0.5, 70 * scale
        rx = (W - rw) / 2; ry = H - rh - 10 * scale
        c.setFillColor(_hex(color)); c.roundRect(rx, ry, rw, rh, 10 * scale, fill=1, stroke=0)
        _draw_text(c, root["title"], W / 2, ry + rh / 2, tfont, 15 * scale, "#FFFFFF", rw - 20 * scale, 2)
        if children:
            cw = min((W - (len(children) - 1) * 20 * scale) / len(children), W * 0.32)
            total = cw * len(children) + 20 * scale * (len(children) - 1)
            x = (W - total) / 2; ch = 64 * scale; cyv = 20 * scale
            for i, ch_it in enumerate(children):
                fill = _shade(color, 0.62)
                c.setFillColor(_hex(fill)); c.roundRect(x, cyv, cw, ch, 8 * scale, fill=1, stroke=0)
                _draw_text(c, ch_it["title"], x + cw / 2, cyv + ch / 2, tfont, 13 * scale, "#FFFFFF", cw - 16 * scale, 2)
                c.setStrokeColor(_hex(color)); c.setLineWidth(4 * scale)
                c.line(W / 2, ry, x + cw / 2, cyv + ch)
                x += cw + 20 * scale

    else:  # pyramid
        n = len(items)
        H = 90 * scale * n + 20 * scale
        buf, c = canvas_for(H)
        base_w = W * 0.9
        for i, it in enumerate(items):
            level = i
            top_w = base_w * (1 - (level + 1) / (n + 1))
            bot_w = base_w * (1 - level / (n + 1))
            yb = 10 * scale + (n - 1 - i) * 90 * scale
            yt = yb + 84 * scale
            fill = _shade(color, 0.45 + level * (0.4 / max(1, n)))
            c.setFillColor(_hex(fill))
            p = c.beginPath()
            p.moveTo(W / 2 - bot_w / 2, yb); p.lineTo(W / 2 + bot_w / 2, yb)
            p.lineTo(W / 2 + top_w / 2, yt); p.lineTo(W / 2 - top_w / 2, yt); p.close()
            c.drawPath(p, fill=1, stroke=0)
            _draw_text(c, it["title"], W / 2, (yb + yt) / 2, tfont, 14 * scale, "#FFFFFF", top_w or 100, 2)

    c.showPage(); c.save()
    pdf_bytes = buf.getvalue()

    # rastériser en PNG
    import os
    import subprocess
    import tempfile
    with tempfile.TemporaryDirectory() as tmp:
        pp = os.path.join(tmp, "d.pdf")
        open(pp, "wb").write(pdf_bytes)
        pre = os.path.join(tmp, "d")
        try:
            subprocess.run(["pdftoppm", "-png", "-r", "150", "-singlefile", pp, pre],
                           check=True, capture_output=True)
            data = open(pre + ".png", "rb").read()
        except Exception:
            return None, 0, 0
    w = h = 0
    try:
        from PIL import Image
        with Image.open(io.BytesIO(data)) as im:
            w, h = im.size
    except Exception:
        pass
    return data, w, h
