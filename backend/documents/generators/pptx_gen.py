"""
Générateur PowerPoint (.pptx) fidèle au thème fourni.

Le rendu s'appuie sur un modèle de base (``assets/pptx_base.pptx``) qui contient
le **thème 1** et deux dispositions : **Titre** et **Contenu**. Les diapositives
générées utilisent ces dispositions, donc héritent fidèlement des styles par
défaut (polices, tailles, couleurs).

Personnalisation autorisée uniquement :
  - **logo** de la page de titre (logo de l'entreprise) ;
  - **couleur principale** (accent1 du thème).
"""
import io
import os
import re

from .base import GenerationContext, interpolate, placeholder_context

BASE_PPTX = os.path.join(os.path.dirname(os.path.dirname(__file__)), "assets", "pptx_base.pptx")


def _cfg(ctx):
    s = ctx.document.template.settings or {}
    p = s.get("pptx", {}) or {}
    color = (p.get("theme_color") or s.get("table_color") or "").lstrip("#")
    return {
        "theme_color": color,  # vide => couleur par défaut du thème
        "cover_title": s.get("cover_title", "{{document_title}}"),
        "cover_subtitle": s.get("cover_subtitle", "{{client_name}} — {{project_name}}"),
    }


def _logo_path(ctx):
    logo = getattr(ctx.company, "logo", None)
    try:
        if logo and logo.path and os.path.exists(logo.path):
            return logo.path
    except Exception:
        pass
    return None


def _layout_by_name(prs, *names):
    for layout in prs.slide_layouts:
        if layout.name in names:
            return layout
    return None


def _set_accent(prs, hexcolor):
    """Change la couleur accent1 du thème (couleur principale)."""
    if not hexcolor:
        return
    hexcolor = hexcolor.upper()
    try:
        from pptx.opc.constants import RELATIONSHIP_TYPE as RT
        theme_part = prs.slide_masters[0].part.part_related_by(RT.THEME)
    except Exception:
        return
    try:
        xml = theme_part.blob.decode("utf-8")
        # accent1 : remplace la couleur srgbClr à l'intérieur de <a:accent1>...</a:accent1>
        def repl(m):
            inner = re.sub(r'val="[0-9A-Fa-f]{6}"', f'val="{hexcolor}"', m.group(1), count=1)
            return f"<a:accent1>{inner}</a:accent1>"
        new_xml = re.sub(r"<a:accent1>(.*?)</a:accent1>", repl, xml, count=1, flags=re.S)
        theme_part._blob = new_xml.encode("utf-8")
    except Exception:
        pass


def _fill_placeholder(slide, idx, text):
    for ph in slide.placeholders:
        if ph.placeholder_format.idx == idx:
            ph.text = text
            return ph
    return None


def _content_ph(slide):
    # renvoie le placeholder de contenu (OBJECT/BODY) ou le titre à défaut
    for ph in slide.placeholders:
        t = ph.placeholder_format.type
        if int(t) in (7, 2):  # OBJECT, BODY
            return ph
    for ph in slide.placeholders:
        if ph.placeholder_format.idx not in (0, 10):
            return ph
    return None


def render(ctx: GenerationContext) -> bytes:
    from pptx import Presentation
    from pptx.util import Inches, Pt

    pctx = placeholder_context(ctx)
    cfg = _cfg(ctx)
    schema = ctx.document.template.schema or []

    if os.path.exists(BASE_PPTX):
        prs = Presentation(BASE_PPTX)
    else:
        prs = Presentation()

    _set_accent(prs, cfg["theme_color"])

    titre = _layout_by_name(prs, "Titre", "Title Slide") or prs.slide_layouts[0]
    contenu = _layout_by_name(prs, "Contenu", "Content", "Title and Content") \
        or (prs.slide_layouts[1] if len(prs.slide_layouts) > 1 else prs.slide_layouts[0])

    # --- Diapositive de titre ---
    s0 = prs.slides.add_slide(titre)
    _fill_placeholder(s0, 0, interpolate(cfg["cover_title"], pctx))
    _fill_placeholder(s0, 1, interpolate(cfg["cover_subtitle"], pctx))
    logo = _logo_path(ctx)
    if logo:
        try:
            s0.shapes.add_picture(logo, prs.slide_width - Inches(2.6),
                                  Inches(0.35), height=Inches(0.9))
        except Exception:
            pass

    # --- Contenu : une diapo « Contenu » par bloc heading ---
    cur = None

    def new_slide(title):
        nonlocal cur
        cur = prs.slides.add_slide(contenu)
        _fill_placeholder(cur, 0, title)
        # vider le contenu par défaut
        cp = _content_ph(cur)
        if cp is not None:
            cp.text_frame.clear()
        return cur

    def body_tf():
        if cur is None:
            new_slide(interpolate("{{document_title}}", pctx))
        return _content_ph(cur).text_frame

    def add_line(text, level=0):
        tf = body_tf()
        if len(tf.paragraphs) == 1 and not tf.paragraphs[0].runs and not tf.paragraphs[0].text:
            p = tf.paragraphs[0]
        else:
            p = tf.add_paragraph()
        p.text = text
        p.level = level

    for block in schema:
        bt = block.get("type")
        if bt == "heading":
            new_slide(interpolate(block.get("text", ""), pctx))
        elif bt == "text":
            for line in interpolate(block.get("text", ""), pctx).split("\n"):
                if line.strip():
                    add_line(line.strip())
        elif bt in ("bullet_list", "numbered_list"):
            items = block.get("items") or [l for l in interpolate(block.get("text", ""), pctx).split("\n") if l.strip()]
            for it in items:
                add_line(interpolate(str(it), pctx))
        elif bt == "richtext":
            txt = re.sub(r"<[^>]+>", "", interpolate(block.get("text", ""), pctx))
            for line in txt.split("\n"):
                if line.strip():
                    add_line(line.strip())
        elif bt == "image":
            from .layout_render import _resolve_asset
            path = _resolve_asset(block.get("asset_url"))
            if path and cur is not None:
                try:
                    cur.shapes.add_picture(path, Inches(0.9), Inches(2.0), width=Inches(5))
                except Exception:
                    pass
        elif bt == "table":
            _add_table(cur or new_slide(block.get("label", "Tableau")), block, ctx, cfg, Inches, Pt)
        elif bt == "spacer":
            add_line("")

    buf = io.BytesIO()
    prs.save(buf)
    return buf.getvalue()


def _add_table(slide, block, ctx, cfg, Inches, Pt):
    stored = (ctx.data or {}).get(block.get("key", "")) or {}
    columns = stored.get("columns") or [c.get("label", "") for c in block.get("columns", [])]
    rows = stored.get("rows", [])
    if not columns:
        return
    tbl = slide.shapes.add_table(len(rows) + 1, len(columns), Inches(0.9),
                                 Inches(1.8), Inches(11), Inches(0.4 * (len(rows) + 1))).table
    for j, col in enumerate(columns):
        tbl.cell(0, j).text = str(col)
    for i, row in enumerate(rows, 1):
        for j in range(len(columns)):
            val = row[j] if j < len(row) else ""
            tbl.cell(i, j).text = "" if val is None else str(val)
