"""
Diagrammes de formulaire calculés à partir des réponses.

Deux modes :
  - "distribution" : répartition des réponses à UNE question (comptage par
    valeur / option). Idéal pour les listes déroulantes et cases à cocher.
  - "crosstab" : regroupe les réponses par une question (`group_by`) et agrège
    une autre question (`value`) : count / sum / avg.

Rendus portables :
  - PNG (Pillow), sans dépendance système,
  - SVG (généré à la main).

Variantes : bar (barres verticales), hbar (barres horizontales),
pie (camembert), donut (anneau), line (courbe).
"""
import html
import io
import math
import os

PALETTE = ["#1F497D", "#4F81BD", "#9BBB59", "#F79646", "#C0504D", "#8064A2",
           "#2C7FB8", "#00B0A0", "#E8A33D", "#7F8C8D", "#16A085", "#D35400"]

try:
    from documents.generators import housestyle as HS
    FONTS_DIR = HS.FONTS_DIR
except Exception:  # pragma: no cover
    FONTS_DIR = None


# ---------------------------------------------------------------------------
# Calcul du jeu de données
# ---------------------------------------------------------------------------
def _label_for(schema, key):
    from .schema_utils import iter_questions
    for f in iter_questions(schema):
        if f.get("key") == key:
            return f.get("label") or key
    return key


def _options_for(schema, key):
    from .schema_utils import iter_questions
    for f in iter_questions(schema):
        if f.get("key") == key:
            return f.get("options") or []
    return []


def _as_number(v):
    try:
        return float(str(v).replace(",", ".").strip())
    except Exception:
        return None


def compute_series(config, schema, submissions):
    """
    Renvoie {"title", "labels": [...], "values": [...], "unit"} pour une config.
    `submissions` : liste de dicts (les réponses `data`).
    """
    mode = config.get("mode", "distribution")
    rows = [s if isinstance(s, dict) else {} for s in submissions]

    if mode == "crosstab":
        group_by = config.get("group_by")
        value = config.get("value")
        agg = config.get("agg", "count")
        buckets = {}
        order = _options_for(schema, group_by) or []
        for data in rows:
            gv = data.get(group_by)
            if isinstance(gv, list):
                gv = ", ".join(str(x) for x in gv)
            gv = "" if gv is None else str(gv).strip()
            if not gv:
                gv = "—"
            num = _as_number(data.get(value)) if value else None
            buckets.setdefault(gv, [])
            if agg != "count" and num is not None:
                buckets[gv].append(num)
            elif agg == "count":
                buckets[gv].append(1)
        labels, values = [], []
        keys = [o for o in order if o in buckets] + \
               [k for k in buckets if k not in order]
        for k in keys:
            arr = buckets[k]
            if agg == "sum":
                values.append(round(sum(arr), 2))
            elif agg == "avg":
                values.append(round(sum(arr) / len(arr), 2) if arr else 0)
            else:
                values.append(len(arr))
            labels.append(k)
        title = config.get("title") or (
            f"{_label_for(schema, value)} ({agg}) par "
            f"{_label_for(schema, group_by)}")
        return {"title": title, "labels": labels, "values": values,
                "unit": config.get("unit", "")}

    # distribution (défaut)
    question = config.get("question") or config.get("group_by")
    counts = {}
    order = _options_for(schema, question) or []
    for data in rows:
        v = data.get(question)
        vals = v if isinstance(v, list) else [v]
        for item in vals:
            item = "" if item is None else str(item).strip()
            if item == "" or item.lower() in ("false", "none"):
                continue
            counts[item] = counts.get(item, 0) + 1
    keys = [o for o in order if o in counts] + \
           [k for k in counts if k not in order]
    labels = keys
    values = [counts[k] for k in keys]
    title = config.get("title") or f"Répartition — {_label_for(schema, question)}"
    return {"title": title, "labels": labels, "values": values, "unit": ""}


# ---------------------------------------------------------------------------
# Rendu SVG
# ---------------------------------------------------------------------------
def _esc(t):
    return html.escape(str(t))


def render_svg(config, series):
    variant = config.get("variant", "bar")
    labels = series["labels"] or ["—"]
    values = series["values"] or [0]
    title = series["title"]
    color = config.get("color") or PALETTE[0]
    W, H = 720, 440

    def color_at(i):
        return config.get("color") if variant in ("bar", "hbar", "line") and config.get("color") else PALETTE[i % len(PALETTE)]

    parts = [
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" '
        f'viewBox="0 0 {W} {H}" font-family="Segoe UI, Roboto, sans-serif">',
        f'<rect width="{W}" height="{H}" fill="#ffffff"/>',
        f'<text x="{W/2}" y="30" text-anchor="middle" font-size="20" '
        f'font-weight="700" fill="#1e293b">{_esc(title)}</text>',
    ]

    if variant in ("pie", "donut"):
        cx, cy, r = W / 2, H / 2 + 10, 150
        total = sum(values) or 1
        ang = -math.pi / 2
        for i, v in enumerate(values):
            frac = v / total
            a2 = ang + frac * 2 * math.pi
            x1, y1 = cx + r * math.cos(ang), cy + r * math.sin(ang)
            x2, y2 = cx + r * math.cos(a2), cy + r * math.sin(a2)
            large = 1 if frac > 0.5 else 0
            parts.append(
                f'<path d="M{cx},{cy} L{x1:.1f},{y1:.1f} '
                f'A{r},{r} 0 {large} 1 {x2:.1f},{y2:.1f} Z" '
                f'fill="{PALETTE[i % len(PALETTE)]}"/>')
            mid = (ang + a2) / 2
            lx, ly = cx + (r + 22) * math.cos(mid), cy + (r + 22) * math.sin(mid)
            anchor = "start" if math.cos(mid) >= 0 else "end"
            parts.append(
                f'<text x="{lx:.1f}" y="{ly:.1f}" text-anchor="{anchor}" '
                f'font-size="12" fill="#334155">{_esc(labels[i])} '
                f'({v})</text>')
            ang = a2
        if variant == "donut":
            parts.append(f'<circle cx="{cx}" cy="{cy}" r="{r*0.55:.0f}" '
                         f'fill="#ffffff"/>')
        parts.append("</svg>")
        return "\n".join(parts).encode("utf-8")

    # Repères pour barres / courbe
    ml, mr, mt, mb = 60, 30, 55, 70
    pw, ph = W - ml - mr, H - mt - mb
    vmax = max(values) or 1

    if variant == "hbar":
        n = len(values)
        bh = ph / n * 0.7
        gap = ph / n
        for i, v in enumerate(values):
            y = mt + i * gap + (gap - bh) / 2
            bw = (v / vmax) * pw
            parts.append(f'<rect x="{ml}" y="{y:.1f}" width="{bw:.1f}" '
                         f'height="{bh:.1f}" rx="3" fill="{color_at(i)}"/>')
            parts.append(f'<text x="{ml-6}" y="{y+bh/2+4:.1f}" text-anchor="end" '
                         f'font-size="11" fill="#334155">{_esc(labels[i])}</text>')
            parts.append(f'<text x="{ml+bw+5:.1f}" y="{y+bh/2+4:.1f}" '
                         f'font-size="11" fill="#334155">{v}</text>')
        parts.append("</svg>")
        return "\n".join(parts).encode("utf-8")

    # axe
    parts.append(f'<line x1="{ml}" y1="{mt+ph}" x2="{ml+pw}" y2="{mt+ph}" '
                 f'stroke="#cbd5e1"/>')
    parts.append(f'<line x1="{ml}" y1="{mt}" x2="{ml}" y2="{mt+ph}" '
                 f'stroke="#cbd5e1"/>')
    n = len(values)
    step = pw / max(1, n)

    if variant == "line":
        pts = []
        for i, v in enumerate(values):
            x = ml + step * (i + 0.5)
            y = mt + ph - (v / vmax) * ph
            pts.append((x, y))
        path = " ".join(f'{"M" if i==0 else "L"}{x:.1f},{y:.1f}'
                        for i, (x, y) in enumerate(pts))
        parts.append(f'<path d="{path}" fill="none" stroke="{color}" '
                     f'stroke-width="3"/>')
        for i, (x, y) in enumerate(pts):
            parts.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="4" '
                         f'fill="{color}"/>')
            parts.append(f'<text x="{x:.1f}" y="{y-10:.1f}" text-anchor="middle" '
                         f'font-size="11" fill="#334155">{values[i]}</text>')
            parts.append(f'<text x="{x:.1f}" y="{mt+ph+18:.1f}" '
                         f'text-anchor="middle" font-size="11" '
                         f'fill="#334155">{_esc(labels[i])}</text>')
    else:  # bar
        bw = step * 0.6
        for i, v in enumerate(values):
            x = ml + step * i + (step - bw) / 2
            bh = (v / vmax) * ph
            y = mt + ph - bh
            parts.append(f'<rect x="{x:.1f}" y="{y:.1f}" width="{bw:.1f}" '
                         f'height="{bh:.1f}" rx="3" fill="{color_at(i)}"/>')
            parts.append(f'<text x="{x+bw/2:.1f}" y="{y-6:.1f}" '
                         f'text-anchor="middle" font-size="11" '
                         f'fill="#334155">{v}</text>')
            parts.append(f'<text x="{x+bw/2:.1f}" y="{mt+ph+18:.1f}" '
                         f'text-anchor="middle" font-size="11" '
                         f'fill="#334155">{_esc(labels[i])}</text>')
    parts.append("</svg>")
    return "\n".join(parts).encode("utf-8")


# ---------------------------------------------------------------------------
# Rendu PNG (Pillow)
# ---------------------------------------------------------------------------
def _font(size, bold=False):
    from PIL import ImageFont
    if FONTS_DIR:
        name = "Montserrat-SemiBold.ttf" if bold else "Roboto-Regular.ttf"
        try:
            return ImageFont.truetype(os.path.join(FONTS_DIR, name), size)
        except Exception:
            pass
    try:
        return ImageFont.load_default(size)
    except Exception:
        return ImageFont.load_default()


def _rgb(hexstr, default=(31, 73, 125)):
    try:
        h = str(hexstr or "").lstrip("#")
        if len(h) == 3:
            h = "".join(c * 2 for c in h)
        return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16))
    except Exception:
        return default


def render_png(config, series, scale=2):
    from PIL import Image, ImageDraw
    variant = config.get("variant", "bar")
    labels = series["labels"] or ["—"]
    values = series["values"] or [0]
    title = series["title"]
    base = config.get("color") or PALETTE[0]

    W, H = 720 * scale, 440 * scale
    img = Image.new("RGB", (W, H), (255, 255, 255))
    d = ImageDraw.Draw(img)
    tf = _font(20 * scale, True)
    lf = _font(12 * scale)
    vf = _font(12 * scale, True)

    def ctext(x, y, t, font, fill, anchor="mm"):
        d.text((x, y), str(t), font=font, fill=fill, anchor=anchor)

    ctext(W / 2, 24 * scale, title, tf, (30, 41, 59))

    def pal(i):
        if variant in ("bar", "hbar", "line") and config.get("color"):
            return _rgb(config["color"])
        return _rgb(PALETTE[i % len(PALETTE)])

    if variant in ("pie", "donut"):
        cx, cy, r = W / 2, H / 2 + 10 * scale, 150 * scale
        total = sum(values) or 1
        ang = -90
        for i, v in enumerate(values):
            sweep = v / total * 360
            d.pieslice([cx - r, cy - r, cx + r, cy + r], ang, ang + sweep,
                       fill=pal(i))
            mid = math.radians(ang + sweep / 2)
            lx, ly = cx + (r + 30 * scale) * math.cos(mid), cy + (r + 30 * scale) * math.sin(mid)
            ctext(lx, ly, f"{labels[i]} ({v})", lf, (51, 65, 85))
            ang += sweep
        if variant == "donut":
            rr = r * 0.55
            d.ellipse([cx - rr, cy - rr, cx + rr, cy + rr], fill=(255, 255, 255))
        buf = io.BytesIO(); img.save(buf, "PNG"); return buf.getvalue()

    ml, mr, mt, mb = 60 * scale, 30 * scale, 55 * scale, 70 * scale
    pw, ph = W - ml - mr, H - mt - mb
    vmax = max(values) or 1
    n = len(values)

    if variant == "hbar":
        gap = ph / n
        bh = gap * 0.7
        for i, v in enumerate(values):
            y = mt + i * gap + (gap - bh) / 2
            bw = (v / vmax) * pw
            d.rounded_rectangle([ml, y, ml + bw, y + bh], radius=3 * scale, fill=pal(i))
            ctext(ml - 6 * scale, y + bh / 2, labels[i], lf, (51, 65, 85), "rm")
            ctext(ml + bw + 6 * scale, y + bh / 2, v, vf, (51, 65, 85), "lm")
        buf = io.BytesIO(); img.save(buf, "PNG"); return buf.getvalue()

    d.line([ml, mt + ph, ml + pw, mt + ph], fill=(203, 213, 225), width=scale)
    d.line([ml, mt, ml, mt + ph], fill=(203, 213, 225), width=scale)
    step = pw / max(1, n)

    if variant == "line":
        pts = []
        for i, v in enumerate(values):
            x = ml + step * (i + 0.5)
            y = mt + ph - (v / vmax) * ph
            pts.append((x, y))
        if len(pts) > 1:
            d.line(pts, fill=_rgb(base), width=3 * scale)
        for i, (x, y) in enumerate(pts):
            rr = 4 * scale
            d.ellipse([x - rr, y - rr, x + rr, y + rr], fill=_rgb(base))
            ctext(x, y - 14 * scale, values[i], vf, (51, 65, 85))
            ctext(x, mt + ph + 16 * scale, labels[i], lf, (51, 65, 85))
    else:
        bw = step * 0.6
        for i, v in enumerate(values):
            x = ml + step * i + (step - bw) / 2
            bh = (v / vmax) * ph
            y = mt + ph - bh
            d.rounded_rectangle([x, y, x + bw, mt + ph], radius=3 * scale, fill=pal(i))
            ctext(x + bw / 2, y - 10 * scale, v, vf, (51, 65, 85))
            ctext(x + bw / 2, mt + ph + 16 * scale, labels[i], lf, (51, 65, 85))

    buf = io.BytesIO(); img.save(buf, "PNG"); return buf.getvalue()


def render(config, schema, submissions, fmt="png"):
    """Point d'entrée : renvoie (bytes, mime, ext)."""
    series = compute_series(config, schema, submissions)
    if fmt == "svg":
        return render_svg(config, series), "image/svg+xml", ".svg"
    return render_png(config, series), "image/png", ".png"
