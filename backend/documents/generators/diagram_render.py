"""
Rendu de diagrammes « SmartArt » directement en PNG avec Pillow.

Aucune dépendance système (ni poppler, ni LibreOffice) : le PNG est dessiné en
mémoire, ce qui garantit l'affichage des diagrammes dans les documents Word et
PDF sur tous les environnements (Windows/Linux/macOS).

Variantes : process, list, cycle, hierarchy, pyramid.
Élément = {"title": "...", "text": "..."}.
"""
import io
import math
import os

from . import housestyle as HS
from .base import interpolate, placeholder_context

FONTS = HS.FONTS_DIR
SCALE = 2  # rendu 2x pour la netteté


def _rgb(color, default=(31, 73, 125)):
    try:
        h = str(color or "").lstrip("#")
        if len(h) == 3:
            h = "".join(c * 2 for c in h)
        return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16))
    except Exception:
        return default


def _shade(rgb, factor):
    r, g, b = rgb
    if factor >= 0.5:
        t = (factor - 0.5) * 2
        return (int(r + (255 - r) * t), int(g + (255 - g) * t), int(b + (255 - b) * t))
    t = 1 - factor * 2
    return (int(r * (1 - t)), int(g * (1 - t)), int(b * (1 - t)))


def _font(bold=True, size=28):
    from PIL import ImageFont
    name = "Montserrat-SemiBold.ttf" if bold else "Roboto-Regular.ttf"
    path = os.path.join(FONTS, name)
    try:
        return ImageFont.truetype(path, size)
    except Exception:
        try:
            return ImageFont.truetype(os.path.join(FONTS, "Roboto-Regular.ttf"), size)
        except Exception:
            return ImageFont.load_default()


def _wrap(draw, text, font, max_w):
    words = str(text).split()
    lines, cur = [], ""
    for w in words:
        trial = (cur + " " + w).strip()
        if draw.textlength(trial, font=font) <= max_w or not cur:
            cur = trial
        else:
            lines.append(cur); cur = w
    if cur:
        lines.append(cur)
    return lines or [""]


def _text_center(draw, text, cx, cy, font, fill, max_w, max_lines=4, line_gap=1.18):
    lines = _wrap(draw, text, font, max_w)[:max_lines]
    asc, desc = font.getmetrics()
    lh = (asc + desc) * line_gap
    total = lh * len(lines)
    y = cy - total / 2
    for ln in lines:
        w = draw.textlength(ln, font=font)
        draw.text((cx - w / 2, y), ln, font=font, fill=fill)
        y += lh


def render_png(block, ctx, width_px=1400, color="1F497D"):
    from PIL import Image, ImageDraw

    pctx = placeholder_context(ctx)
    variant = block.get("variant", "process")
    items = [{"title": interpolate(str(it.get("title", "")), pctx),
              "text": interpolate(str(it.get("text", "")), pctx)}
             for it in (block.get("diagram_items") or block.get("items") or []) if it]
    if not items:
        items = [{"title": "Élément", "text": ""}]
    base = _rgb(block.get("color") or color)
    white = (255, 255, 255)
    W = width_px * SCALE

    def canvas(h):
        img = Image.new("RGBA", (W, int(h)), (255, 255, 255, 0))
        return img, ImageDraw.Draw(img)

    n = len(items)

    if variant == "process":
        gap, arrow = 22 * SCALE, 30 * SCALE
        box_w = (W - (n - 1) * (gap + arrow)) / n
        box_h = 150 * SCALE
        H = box_h + 20 * SCALE
        img, d = canvas(H)
        tf, bf = _font(True, 26 * SCALE // 2 * 2), _font(False, 22 * SCALE)
        tf = _font(True, 30); bf = _font(False, 24)
        x = 0
        for i, it in enumerate(items):
            fill = _shade(base, 0.5 + (i % 3) * 0.12)
            d.rounded_rectangle([x, 10 * SCALE, x + box_w, 10 * SCALE + box_h],
                                radius=14 * SCALE, fill=fill)
            _text_center(d, it["title"], x + box_w / 2, 10 * SCALE + box_h * 0.36,
                         _font(True, 32), white, box_w - 24 * SCALE, 2)
            if it["text"]:
                _text_center(d, it["text"], x + box_w / 2, 10 * SCALE + box_h * 0.68,
                             _font(False, 24), (234, 240, 248), box_w - 24 * SCALE, 2)
            x += box_w
            if i < n - 1:
                ay = 10 * SCALE + box_h / 2
                x0 = x + gap * 0.3
                x1 = x + gap + arrow
                d.line([(x0, ay), (x1 - 14 * SCALE, ay)], fill=base, width=8 * SCALE)
                d.polygon([(x1, ay), (x1 - 16 * SCALE, ay - 12 * SCALE),
                           (x1 - 16 * SCALE, ay + 12 * SCALE)], fill=base)
                x += gap + arrow

    elif variant == "list":
        box_h, gap = 84 * SCALE, 14 * SCALE
        H = n * (box_h + gap) + gap
        img, d = canvas(H)
        y = gap
        for i, it in enumerate(items):
            fill = _shade(base, 0.5 + (i % 3) * 0.12)
            d.rounded_rectangle([0, y, W, y + box_h], radius=10 * SCALE, fill=fill)
            f = _font(True, 30)
            d.text((28 * SCALE, y + 16 * SCALE), it["title"], font=f, fill=white)
            if it["text"]:
                bf = _font(False, 23)
                d.text((28 * SCALE, y + 48 * SCALE), it["text"][:120], font=bf, fill=(234, 240, 248))
            y += box_h + gap

    elif variant == "cycle":
        H = W
        img, d = canvas(H)
        cx, cy = W / 2, H / 2
        R = W * 0.33
        node = W * 0.15
        pts = []
        for i in range(n):
            ang = -math.pi / 2 + i * 2 * math.pi / n
            pts.append((cx + R * math.cos(ang), cy + R * math.sin(ang)))
        for i in range(n):
            x1, y1 = pts[i]; x2, y2 = pts[(i + 1) % n]
            d.line([(x1, y1), (x2, y2)], fill=base, width=6 * SCALE)
        for i, (x, y) in enumerate(pts):
            fill = _shade(base, 0.5 + (i % 3) * 0.12)
            d.ellipse([x - node, y - node, x + node, y + node], fill=fill)
            _text_center(d, items[i]["title"], x, y, _font(True, 28), white, node * 1.7, 3)

    elif variant == "hierarchy":
        root = items[0]; children = items[1:]
        H = 300 * SCALE
        img, d = canvas(H)
        rw, rh = W * 0.5, 84 * SCALE
        rx, ry = (W - rw) / 2, 12 * SCALE
        d.rounded_rectangle([rx, ry, rx + rw, ry + rh], radius=12 * SCALE, fill=base)
        _text_center(d, root["title"], W / 2, ry + rh / 2, _font(True, 32), white, rw - 24 * SCALE, 2)
        if children:
            cw = min((W - (len(children) - 1) * 24 * SCALE) / len(children), W * 0.30)
            total = cw * len(children) + 24 * SCALE * (len(children) - 1)
            x = (W - total) / 2
            cy0, ch = 200 * SCALE, 80 * SCALE
            for it in children:
                fill = _shade(base, 0.62)
                d.line([(W / 2, ry + rh), (x + cw / 2, cy0)], fill=base, width=5 * SCALE)
                d.rounded_rectangle([x, cy0, x + cw, cy0 + ch], radius=10 * SCALE, fill=fill)
                _text_center(d, it["title"], x + cw / 2, cy0 + ch / 2, _font(True, 26), white, cw - 18 * SCALE, 2)
                x += cw + 24 * SCALE

    else:  # pyramid
        level_h = 96 * SCALE
        H = level_h * n + 20 * SCALE
        img, d = canvas(H)
        base_w = W * 0.92
        for i, it in enumerate(items):
            top_w = base_w * (1 - (i + 1) / (n + 1))
            bot_w = base_w * (1 - i / (n + 1))
            yt = 10 * SCALE + i * level_h
            yb = yt + level_h - 8 * SCALE
            fill = _shade(base, 0.45 + i * (0.4 / max(1, n)))
            d.polygon([(W / 2 - top_w / 2, yt), (W / 2 + top_w / 2, yt),
                       (W / 2 + bot_w / 2, yb), (W / 2 - bot_w / 2, yb)], fill=fill)
            _text_center(d, it["title"], W / 2, (yt + yb) / 2, _font(True, 28), white, top_w or 120, 2)

    buf = io.BytesIO()
    img.save(buf, "PNG")
    data = buf.getvalue()
    return data, img.width, img.height
