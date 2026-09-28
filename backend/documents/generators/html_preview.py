"""
Aperçu HTML portable des documents.

Objectif : afficher un aperçu fidèle DIRECTEMENT dans le navigateur, sans
dépendance système (ni Microsoft Word, ni LibreOffice, ni poppler) et sans
requête vers un hôte média séparé. Le HTML est renvoyé « inline » et affiché
via `srcdoc` dans l'application.

Couvre : documents par blocs (Word/PDF/Lettre/Mail/Brochure), classeurs Excel,
présentations PowerPoint. Les pages à positionnement libre (garde/suivi/A3) et
les diagrammes sont rastérisés en PNG (Pillow) et intégrés en `data:` URI.
"""
import base64
import html as _html
import io

from .base import interpolate, placeholder_context


def _esc(t):
    return _html.escape("" if t is None else str(t))


def _png_data_uri(png_bytes):
    if not png_bytes:
        return None
    return "data:image/png;base64," + base64.b64encode(png_bytes).decode("ascii")


def _resolved_color(resolved, element, default):
    props = (resolved or {}).get(element) or {}
    return props.get("color") or default


_ALIGN_CSS = {"left", "center", "right", "justify"}


def _style_css(props):
    """Traduit un style résolu (font/size/bold/italic/color/align/space_after) en CSS."""
    if not props:
        return ""
    st = []
    if props.get("font"):
        st.append(f"font-family:'{_esc(props['font'])}','Segoe UI',sans-serif")
    if props.get("size") not in (None, ""):
        try:
            st.append(f"font-size:{float(props['size']):g}pt")
        except (TypeError, ValueError):
            pass
    if "bold" in props:
        st.append("font-weight:" + ("700" if props["bold"] else "400"))
    if "italic" in props:
        st.append("font-style:" + ("italic" if props["italic"] else "normal"))
    if props.get("color"):
        st.append(f"color:{_esc(props['color'])}")
    if props.get("align") in _ALIGN_CSS:
        st.append(f"text-align:{props['align']}")
    if props.get("space_after") not in (None, ""):
        try:
            st.append(f"margin-bottom:{float(props['space_after']):g}pt")
        except (TypeError, ValueError):
            pass
    return ";".join(st)


def _base_and_override(base_css, resolved, element):
    """Style de base (défaut charte) + surcharge résolue (qui l'emporte)."""
    ov = _style_css((resolved or {}).get(element))
    return base_css + (";" + ov if ov else "")


def _heading_css(lvl, resolved):
    """Style d'un titre h1..h5 : défauts de la charte (HEADINGS) + surcharge résolue."""
    from . import housestyle as HS
    fname, size, color = HS.HEADINGS.get(lvl, ("Montserrat", 12, HS.COLORS["heading"]))
    weight = (600 if "SemiBold" in fname else 700 if "Bold" in fname
              else 300 if "Light" in fname else 500)
    base = (f"font-family:'Montserrat','Segoe UI',sans-serif;font-size:{size}pt;"
            f"font-weight:{weight};color:{color}")
    return _base_and_override(base, resolved, f"h{lvl}")


def _cover_title_css(resolved):
    from . import housestyle as HS
    fname, size, color = HS.TITLE
    base = ("font-family:'Montserrat','Segoe UI',sans-serif;"
            f"font-size:{size}pt;font-weight:600;color:{color};"
            "text-align:center;margin:0 0 .35em")
    return _base_and_override(base, resolved, "title")


def _cover_subtitle_css(resolved):
    from . import housestyle as HS
    fname, size, color = HS.SUBTITLE
    base = ("font-family:'Montserrat','Segoe UI',sans-serif;"
            f"font-size:{size}pt;font-weight:400;color:{color};"
            "text-align:center;margin:0")
    return _base_and_override(base, resolved, "subtitle")


def _cover_html(ctx, resolved):
    """Page de garde structurée (titre / sous-titre / logo / méta), façon Word.

    Mirroir de la page de garde du .docx quand aucun calque libre « cover »
    n'est défini (dans ce cas l'image du calque est rendue par `_blocks_html`).
    """
    from . import layout_render as LR
    if LR.has_layout(ctx, "cover"):
        return ""
    settings = ctx.document.template.settings or {}
    if not settings.get("include_cover", True):
        return ""
    pctx = placeholder_context(ctx)
    title = _esc(interpolate(settings.get("cover_title", "{{document_title}}"), pctx))
    subtitle = _esc(interpolate(
        settings.get("cover_subtitle", "{{client_name}} — {{project_name}}"), pctx))
    logo = _logo_data_uri(ctx)
    logo_html = f'<img class="cover-logo" src="{logo}"/>' if logo else ""
    meta = " · ".join(x for x in (
        _esc(pctx.get("doc_date", "")), _esc(pctx.get("version", "")),
        _esc(pctx.get("confidentiality", ""))) if x)
    return (
        '<div class="page page--doc cover-page">'
        f'<div class="cover-top">{logo_html}</div>'
        '<div class="cover-mid">'
        f'<div class="cover-title" style="{_cover_title_css(resolved)}">{title}</div>'
        f'<div class="cover-sub" style="{_cover_subtitle_css(resolved)}">{subtitle}</div>'
        '</div>'
        f'<div class="cover-bottom">{meta}</div>'
        '</div>')


def _logo_data_uri(ctx):
    import os
    logo = getattr(ctx.company, "logo", None)
    try:
        if logo and logo.path and os.path.exists(logo.path):
            with open(logo.path, "rb") as f:
                ext = os.path.splitext(logo.path)[1].lstrip(".").lower() or "png"
                mime = "jpeg" if ext in ("jpg", "jpeg") else ext
                return f"data:image/{mime};base64," + base64.b64encode(f.read()).decode("ascii")
    except Exception:
        pass
    return None


def _file_data_uri(path):
    import os
    try:
        if path and os.path.exists(path):
            with open(path, "rb") as f:
                ext = os.path.splitext(path)[1].lstrip(".").lower() or "png"
                mime = "jpeg" if ext in ("jpg", "jpeg") else ext
                return f"data:image/{mime};base64," + base64.b64encode(f.read()).decode("ascii")
    except Exception:
        pass
    return None


def _sheet_image(ctx, image):
    """(data_uri, natural_w, natural_h) d'une image de feuille pour l'aperçu."""
    import os
    source = (image.get("source") or "company").lower()
    path = None
    if source == "url":
        try:
            from .block_gen import _resolve_asset
            path = _resolve_asset(image.get("url"))
        except Exception:
            path = None
    else:
        logo = getattr(ctx.company, "logo", None)
        try:
            path = logo.path if (logo and os.path.exists(logo.path)) else None
        except Exception:
            path = None
    uri = _file_data_uri(path)
    natw = nath = None
    if path:
        try:
            from PIL import Image as _PILImage
            with _PILImage.open(path) as im:
                natw, nath = im.size
        except Exception:
            pass
    return uri, natw, nath


# ---------------------------------------------------------------------------
# Blocs -> HTML
# ---------------------------------------------------------------------------
def _blocks_html(ctx, resolved):
    from . import diagram_render, layout_render as LR
    pctx = placeholder_context(ctx)
    tpl = ctx.document.template
    settings = tpl.settings or {}
    table_hex = "#" + (settings.get("table_color") or "1F497D").lstrip("#")
    para_css = _style_css((resolved or {}).get("paragraph"))
    pstyle = f' style="{para_css}"' if para_css else ""
    out = []

    # Page de garde / suivi (mise en page libre) intégrées en image
    for key in ("cover", "suivi", "page"):
        if LR.has_layout(ctx, key):
            try:
                png, _w, _h = LR.render_png(LR.get_layout(ctx, key), ctx, dpi=110)
                uri = _png_data_uri(png)
                if uri:
                    out.append(f'<div class="freepage"><img src="{uri}" alt="{key}"/></div>')
            except Exception:
                pass

    for b in (tpl.schema or []):
        t = b.get("type")
        if t == "heading":
            lvl = min(max(int(b.get("level", 2)), 1), 5)
            out.append(f'<h{lvl} style="{_heading_css(lvl, resolved)}">{_esc(interpolate(b.get("text",""), pctx))}</h{lvl}>')
        elif t == "text":
            out.append(f'<p{pstyle}>{_esc(interpolate(b.get("text",""), pctx)).replace(chr(10), "<br/>")}</p>')
        elif t == "richtext":
            out.append(f'<div class="rich"{pstyle}>{interpolate(b.get("text",""), pctx)}</div>')
        elif t in ("bullet_list", "numbered_list"):
            tag = "ol" if t == "numbered_list" else "ul"
            items = "".join(f"<li>{_esc(interpolate(x, pctx))}</li>" for x in (b.get("items") or []) if x)
            out.append(f"<{tag}>{items}</{tag}>")
        elif t == "table":
            cols = b.get("columns") or []
            if b.get("label"):
                out.append(f'<p class="tbl-title">{_esc(interpolate(b["label"], pctx))}</p>')
            head = "".join(f'<th style="background:{table_hex}">{_esc(c.get("label",""))}</th>' for c in cols)
            empty = "".join("<td>&nbsp;</td>" for _ in cols)
            out.append(f'<table class="doc-tbl"><thead><tr>{head}</tr></thead>'
                       f'<tbody><tr>{empty}</tr><tr>{empty}</tr></tbody></table>')
        elif t == "field":
            label = _esc(interpolate(b.get("label",""), pctx))
            val = _esc(pctx.get(b.get("key",""), ""))
            if b.get("show_label", True):
                out.append(f'<p class="field"><b>{label} :</b> <span class="fval">{val or "……………"}</span></p>')
            else:
                out.append(f'<p class="fval">{val or "……………"}</p>')
        elif t == "code":
            out.append(f'<pre><code>{_esc(b.get("text",""))}</code></pre>')
        elif t == "link":
            url = _esc(b.get("url",""))
            out.append(f'<p><a href="{url}">{_esc(b.get("label") or url)}</a></p>')
        elif t == "image":
            uri = b.get("asset_url") or ""
            if uri:
                w = b.get("width_pct", 40)
                al = {"center": "center", "right": "right"}.get(b.get("align"), "left")
                out.append(f'<div style="text-align:{al}"><img class="doc-img" style="width:{w}%" src="{_esc(uri)}"/></div>')
        elif t == "logo":
            uri = _logo_data_uri(ctx)
            if uri:
                w = b.get("width_pct", 30)
                al = {"center": "center", "right": "right"}.get(b.get("align"), "left")
                out.append(f'<div style="text-align:{al}"><img class="doc-img" style="width:{w}%" src="{uri}"/></div>')
            else:
                out.append('<p class="muted">[logo entreprise]</p>')
        elif t == "contacts":
            out.append(f'<p class="muted">[{_esc(b.get("label") or "Contacts")}]</p>')
        elif t == "diagram":
            try:
                png, _w, _h = diagram_render.render_png(b, ctx, color=(settings.get("table_color") or "1F497D"))
                uri = _png_data_uri(png)
                if uri:
                    w = b.get("width_pct", 100)
                    out.append(f'<div style="text-align:center"><img class="doc-img" style="width:{w}%" src="{uri}"/></div>')
            except Exception:
                pass
        elif t == "form_diagram":
            from .block_gen import _form_diagram_png
            png = _form_diagram_png(b, ctx)
            uri = _png_data_uri(png)
            if uri:
                w = b.get("width_pct", 90)
                out.append(f'<div style="text-align:center"><img class="doc-img" style="width:{w}%" src="{uri}"/></div>')
            else:
                out.append(f'<p class="muted">[diagramme du formulaire : {_esc(b.get("diagram_key",""))}]</p>')
        elif t == "spacer":
            out.append('<div style="height:1.2rem"></div>')
    return "\n".join(out)


def _col_px(width):
    """Largeur de colonne Excel (en « caractères ») -> pixels approximatifs."""
    try:
        return max(24, int(round(float(width) * 7)) + 5)
    except (TypeError, ValueError):
        return 64


def _row_px(height):
    """Hauteur de ligne Excel (en points) -> pixels approximatifs."""
    try:
        return max(18, int(round(float(height) * 4 / 3)))
    except (TypeError, ValueError):
        return 20


_XL_ALIGN = {"center": "center", "centre": "center", "right": "right",
             "left": "left", "justify": "justify", "general": "left"}
_XL_VALIGN = {"top": "top", "center": "middle", "centre": "middle",
              "bottom": "bottom", "middle": "middle"}


def _fmt_grid_value(value, number_format):
    """Rend une valeur de cellule pour l'aperçu, en tenant compte du format."""
    if value is None or value == "":
        return ""
    nf = number_format or ""
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        # Pourcentage
        if "%" in nf:
            dec = nf.count("0", nf.find(".")) if "." in nf else 0
            return f"{value * 100:.{dec}f} %"
        # Monnaie / séparateur de milliers
        if "#,##0" in nf or "0.00" in nf:
            dec = 2 if ".00" in nf or "0.00" in nf else 0
            txt = f"{value:,.{dec}f}".replace(",", " ").replace(".", ",")
            for sym in ("CHF", "€", "$", "£"):
                if sym in nf:
                    return f"{txt} {sym}"
            return txt
    return str(value)


_DEFAULT_COL_PX = 64   # largeur Excel par défaut (~8.43 car.)
_DEFAULT_ROW_PX = 20   # hauteur Excel par défaut (~15 pt)


def _grid_images_html(sh, ctx, col_widths, row_heights, maxc, maxr):
    """Calques d'images (logo) positionnés/dimensionnés, superposés à la grille."""
    images = sh.get("images") or []
    if not images or ctx is None:
        return ""
    def colpx(c):
        return _col_px(col_widths[str(c)]) if str(c) in col_widths else _DEFAULT_COL_PX
    def rowpx(r):
        return _row_px(row_heights[str(r)]) if str(r) in row_heights else _DEFAULT_ROW_PX
    out = []
    for image in images:
        uri, natw, nath = _sheet_image(ctx, image)
        if not uri:
            continue
        try:
            col = max(1, int(image.get("col", 1)))
            row = max(1, int(image.get("row", 1)))
        except (TypeError, ValueError):
            continue
        ratio = (natw / nath) if (natw and nath) else 2.61
        w = image.get("width"); h = image.get("height")
        try:
            if w and not h:
                w = float(w); h = w / ratio
            elif h and not w:
                h = float(h); w = h * ratio
            elif w and h:
                w = float(w); h = float(h)
            elif natw and nath:
                w, h = float(natw), float(nath)
            else:
                w, h = 140.0, 140.0 / ratio
        except (TypeError, ValueError, ZeroDivisionError):
            w, h = 140.0, 140.0 / ratio
        left = sum(colpx(c) for c in range(1, col)) + int(image.get("offset_x", 0) or 0)
        top = sum(rowpx(r) for r in range(1, row)) + int(image.get("offset_y", 0) or 0)
        out.append(
            f'<img src="{uri}" alt="logo" style="position:absolute;'
            f'left:{left}px;top:{top}px;width:{w:.0f}px;height:{h:.0f}px;'
            f'object-fit:contain;pointer-events:none">')
    return "".join(out)


def _grid_html(sh, pctx, ctx=None):
    """Rend un onglet « grille » en table HTML fidèle (fusions, styles, tailles)."""
    cells = sh.get("cells") or []
    if not cells and not (sh.get("images")):
        return '<p class="muted">Onglet vide.</p>'
    col_widths = sh.get("col_widths") or {}
    row_heights = sh.get("row_heights") or {}

    cmap = {}
    covered = set()
    maxr, maxc = 1, 1
    for cell in cells:
        try:
            r = int(cell.get("row", 1)); c = int(cell.get("col", 1))
        except (TypeError, ValueError):
            continue
        if r < 1 or c < 1:
            continue
        cmap[(r, c)] = cell
        rspan = max(1, int(cell.get("row_span", 1) or 1))
        cspan = max(1, int(cell.get("col_span", 1) or 1))
        maxr = max(maxr, r + rspan - 1)
        maxc = max(maxc, c + cspan - 1)
        for rr in range(r, r + rspan):
            for cc in range(c, c + cspan):
                if (rr, cc) != (r, c):
                    covered.add((rr, cc))
    for k in col_widths:
        try:
            maxc = max(maxc, int(k))
        except (TypeError, ValueError):
            pass
    for k in row_heights:
        try:
            maxr = max(maxr, int(k))
        except (TypeError, ValueError):
            pass

    colgroup = "".join(
        f'<col style="width:{_col_px(col_widths.get(str(c)))}px">'
        if str(c) in col_widths else "<col>"
        for c in range(1, maxc + 1))

    rows_html = []
    for r in range(1, maxr + 1):
        tds = []
        rh = row_heights.get(str(r))
        for c in range(1, maxc + 1):
            if (r, c) in covered:
                continue
            cell = cmap.get((r, c))
            if cell is None:
                tds.append('<td class="xl-e"></td>')
                continue
            raw = cell.get("value", "")
            if isinstance(raw, str):
                raw = interpolate(raw, pctx)
            text = _esc(_fmt_grid_value(raw, cell.get("number_format")))
            st = []
            if cell.get("bg"):
                st.append(f"background:{_esc(cell['bg'])}")
            if cell.get("color"):
                st.append(f"color:{_esc(cell['color'])}")
            if cell.get("bold"):
                st.append("font-weight:700")
            if cell.get("italic"):
                st.append("font-style:italic")
            if cell.get("underline"):
                st.append("text-decoration:underline")
            if cell.get("size"):
                try:
                    st.append(f"font-size:{float(cell['size'])}pt")
                except (TypeError, ValueError):
                    pass
            align = _XL_ALIGN.get((cell.get("align") or "").lower())
            if align:
                st.append(f"text-align:{align}")
            valign = _XL_VALIGN.get((cell.get("valign") or "").lower())
            if valign:
                st.append(f"vertical-align:{valign}")
            st.append("white-space:normal" if cell.get("wrap") else "white-space:nowrap")
            if cell.get("border"):
                st.append("border:1px solid #94a3b8")
            attrs = []
            cspan = max(1, int(cell.get("col_span", 1) or 1))
            rspan = max(1, int(cell.get("row_span", 1) or 1))
            if cspan > 1:
                attrs.append(f'colspan="{cspan}"')
            if rspan > 1:
                attrs.append(f'rowspan="{rspan}"')
            attrs.append(f'style="{";".join(st)}"')
            tds.append(f'<td {" ".join(attrs)}>{text or "&nbsp;"}</td>')
        style = f' style="height:{_row_px(rh)}px"' if rh else ""
        rows_html.append(f"<tr{style}>{''.join(tds)}</tr>")

    overlay = _grid_images_html(sh, ctx, col_widths, row_heights, maxc, maxr)
    stage = "position:relative;display:inline-block;min-width:100%"
    return (f'<div class="xl-wrap"><div style="{stage}">'
            f'<table class="xl-grid"><colgroup>{colgroup}</colgroup>'
            f'<tbody>{"".join(rows_html)}</tbody></table>{overlay}</div></div>')


def _excel_html(ctx):
    settings = ctx.document.template.settings or {}
    sheets = (settings.get("excel") or {}).get("sheets") or []
    pctx = placeholder_context(ctx)
    out = []
    for sh in sheets:
        out.append(f'<h2>📊 {_esc(sh.get("name","Onglet"))}</h2>')
        if sh.get("title"):
            out.append(f'<p class="tbl-title">{_esc(interpolate(sh["title"], pctx))}</p>')
        stype = sh.get("type", "table")
        if stype == "grid":
            out.append(_grid_html(sh, pctx, ctx))
        elif stype == "info":
            out.append('<table class="doc-tbl"><tbody>')
            for it in (sh.get("items") or []):
                out.append(f'<tr><th>{_esc(it.get("label",""))}</th>'
                           f'<td>{_esc(interpolate(str(it.get("value","")), pctx))}</td></tr>')
            out.append("</tbody></table>")
        elif stype == "pivot":
            out.append('<p class="muted">Tableau croisé calculé à la génération.</p>')
        else:  # table
            cols = sh.get("columns") or []
            head = "".join(f'<th>{_esc(c.get("label",""))}</th>' for c in cols)
            empty = "".join("<td>&nbsp;</td>" for _ in cols)
            out.append(f'<table class="doc-tbl"><thead><tr>{head}</tr></thead><tbody>'
                       + "".join(f"<tr>{empty}</tr>" for _ in range(3)) + "</tbody></table>")
    if not sheets:
        out.append('<p class="muted">Classeur vide.</p>')
    return "\n".join(out)


def _pptx_html(ctx):
    pctx = placeholder_context(ctx)
    tpl = ctx.document.template
    settings = tpl.settings or {}
    main = (settings.get("pptx") or {}).get("main_color") or "#1F497D"
    slides = []
    cur = None
    for b in (tpl.schema or []):
        t = b.get("type")
        if t == "heading":
            if cur:
                slides.append(cur)
            cur = {"title": interpolate(b.get("text",""), pctx), "body": []}
        else:
            if cur is None:
                cur = {"title": interpolate(tpl.name, pctx), "body": []}
            if t in ("text",):
                cur["body"].append(_esc(interpolate(b.get("text",""), pctx)))
            elif t in ("bullet_list", "numbered_list"):
                for x in (b.get("items") or []):
                    if x:
                        cur["body"].append("• " + _esc(interpolate(x, pctx)))
    if cur:
        slides.append(cur)
    if not slides:
        slides = [{"title": interpolate(tpl.name, pctx), "body": []}]
    out = []
    for i, s in enumerate(slides, 1):
        body = "".join(f"<div class='sl-line'>{ln}</div>" for ln in s["body"])
        out.append(
            f'<div class="slide"><div class="sl-bar" style="background:{_esc(main)}"></div>'
            f'<div class="sl-title" style="color:{_esc(main)}">{_esc(s["title"])}</div>'
            f'<div class="sl-body">{body}</div><div class="sl-num">{i}</div></div>')
    return "\n".join(out)


_SHELL = """<!doctype html><html lang="fr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700&family=Roboto:wght@400;500;700&display=swap" rel="stylesheet"><style>
:root{{ --ink:#1D1E1B; --muted:#6D6D6A; --border:#CBC7BC; --acc:{acc}; }}
*{{box-sizing:border-box}}
body{{margin:0;background:#e9ecf3;font-family:'Roboto',-apple-system,'Segoe UI',sans-serif;color:var(--ink);padding:24px}}
.page{{max-width:820px;margin:0 auto 22px;background:#fff;border-radius:2px;box-shadow:0 6px 26px rgba(15,23,42,.18);padding:48px 56px}}
h1,h2,h3,h4,h5{{line-height:1.15;margin:1.1em 0 .45em;font-family:'Montserrat','Segoe UI',sans-serif}}
h1{{font-size:1.9rem}} h2{{font-size:1.45rem}} h3{{font-size:1.2rem}}
p{{margin:.5em 0}} ul,ol{{margin:.4em 0 .8em 1.3em}}
a{{color:var(--acc)}}
.muted{{color:var(--muted)}}
.tbl-title{{font-weight:600;margin:.6em 0 .2em}}
table.doc-tbl{{border-collapse:collapse;width:100%;margin:.4em 0 1.1em;font-size:9.5pt}}
table.doc-tbl th,table.doc-tbl td{{border:1px solid var(--border);padding:.34rem .55rem;text-align:left;vertical-align:top}}
table.doc-tbl thead th{{color:#fff;font-weight:600}}
table.doc-tbl tbody th{{background:#F5F3EF;color:var(--ink);font-weight:600;width:34%}}
table.meta-tbl{{max-width:520px}}
.page--wide{{max-width:1180px;padding:32px 36px}}
/* Aperçu fidèle d'une feuille Word/PDF (A4 : 210x297mm ~ 794x1123px @96dpi ;
   marges modèle : haut 4.5cm, côtés/bas 2cm ~ 170px/76px). */
.page--doc{{width:794px;max-width:100%;min-height:1123px;padding:170px 76px 76px;position:relative;
  font-family:'Roboto','Segoe UI',sans-serif;font-size:9.5pt;line-height:1.42;color:var(--ink)}}
.page--doc .doc-body :is(h1,h2,h3,h4){{font-family:'Montserrat','Segoe UI',sans-serif}}
.doc-header{{position:absolute;top:56px;left:76px;right:76px;
  border-bottom:1.2px solid var(--acc);padding-bottom:10px;color:var(--muted);font-size:8.5pt}}
.doc-header .hf-logo{{max-height:42px;vertical-align:middle;margin-right:10px}}
.doc-header .rich{{display:inline-block;vertical-align:middle}}
.doc-footer{{position:absolute;left:76px;right:76px;bottom:34px;
  border-top:1px solid var(--border);padding-top:8px;color:var(--muted);font-size:8pt}}
.page--doc .doc-body p{{margin:.42em 0}}
/* Page de garde (aperçu Word) : titre/sous-titre centrés, logo, méta en pied */
.cover-page{{min-height:1123px;display:flex;flex-direction:column;
  align-items:center;justify-content:flex-start;text-align:center}}
.cover-top{{min-height:120px;display:flex;align-items:center;justify-content:center;margin-bottom:8%}}
.cover-logo{{max-height:96px;max-width:60%;object-fit:contain}}
.cover-mid{{flex:0 0 auto;margin-top:14%;max-width:90%}}
.cover-bottom{{margin-top:auto;color:var(--muted);font-size:.85rem;letter-spacing:.03em;
  border-top:1px solid var(--border);padding-top:14px;width:60%}}
.suivi-page h1:first-child,.toc-page h1:first-child{{margin-top:0}}
.toc-hint{{font-size:9pt}}
@media(prefers-color-scheme:dark){{.cover-bottom{{color:#94a3b8;border-color:#334155}}}}
@media(prefers-color-scheme:dark){{.doc-header{{color:#cbd5e1}} .doc-footer{{color:#94a3b8;border-color:#334155}}}}
.xl-wrap{{overflow-x:auto;margin:.4em 0 1.2em;border:1px solid #e2e8f0;border-radius:6px}}
table.xl-grid{{border-collapse:collapse;table-layout:fixed;font-size:.82rem;background:#fff}}
table.xl-grid td{{border:1px solid #eef1f6;padding:2px 6px;vertical-align:middle;
  overflow:hidden;text-overflow:ellipsis;color:var(--ink)}}
table.xl-grid td.xl-e{{color:#cbd5e1}}
h2{{display:flex;align-items:center;gap:.4rem}}
pre{{background:#0f172a;color:#e2e8f0;padding:1rem;border-radius:8px;overflow:auto}}
.doc-img{{max-width:100%;border-radius:6px}}
.freepage img{{width:100%;border:1px solid #e2e8f0;border-radius:6px;margin-bottom:1rem}}
.field .fval{{color:#0f172a}}
.rich :is(h1,h2,h3){{margin:.5em 0}}
.slide{{position:relative;max-width:820px;margin:0 auto 20px;aspect-ratio:16/9;background:#fff;border-radius:10px;
  box-shadow:0 8px 30px rgba(15,23,42,.14);padding:42px 48px;overflow:hidden}}
.sl-bar{{position:absolute;top:0;left:0;right:0;height:10px}}
.sl-title{{font-size:1.7rem;font-weight:800;margin-top:.3em;letter-spacing:-.01em}}
.sl-body{{margin-top:1rem;font-size:1.05rem}} .sl-line{{margin:.4rem 0}}
.sl-num{{position:absolute;bottom:16px;right:22px;color:#94a3b8;font-size:.8rem}}
@media(prefers-color-scheme:dark){{body{{background:#0b1120}}.page{{background:#0f1a2e;color:#e2e8f0}}
 table.doc-tbl td,table.doc-tbl th{{border-color:#334155}} table.doc-tbl tbody th{{background:#1e293b;color:#e2e8f0}}
 .xl-wrap{{border-color:#334155}} table.xl-grid{{background:#0f1a2e}}
 table.xl-grid td{{border-color:#22304a;color:#e2e8f0}} table.xl-grid td.xl-e{{color:#475569}}}}
</style></head><body>{body}</body></html>"""


def _suivi_html(ctx, resolved, acc):
    """Page de suivi (Identification + Révisions), miroir du .docx.

    Rendue quand le modèle active « include_suivi », entre la page de garde et
    le contenu, comme dans block_gen.render_docx.
    """
    settings = ctx.document.template.settings or {}
    if not settings.get("include_suivi", True):
        return ""
    sec_css = _heading_css(1, resolved)
    project = getattr(ctx, "project", None)
    pctx = placeholder_context(ctx)
    ident = [
        ("Client", getattr(project, "client_name", "") or pctx.get("client_name", "")),
        ("Projet", getattr(project, "name", "") or pctx.get("project_name", "")),
        ("Séquence / Référence", getattr(project, "reference", "") or "—"),
        ("Confidentialité", pctx.get("confidentiality", "") or getattr(ctx, "confidentiality_label", "")),
    ]
    ident_rows = "".join(
        f'<tr><th scope="row">{_esc(str(k))}</th><td>{_esc(str(v))}</td></tr>'
        for k, v in ident)

    # Révisions : versions existantes, sinon la génération en cours.
    rev_rows = []
    try:
        versions = list(ctx.document.versions.order_by("version_number"))
    except Exception:
        versions = []
    if not versions:
        rev_rows.append(
            f'<tr><td>{_esc(str(getattr(ctx, "version_number", 1)))}.0</td>'
            f'<td>en cours</td><td>{_esc(getattr(ctx, "author_initials", "") or "")}</td>'
            f'<td>{_esc(getattr(ctx, "comment", "") or "Génération initiale.")}</td></tr>')
    for v in versions:
        rev_rows.append(
            f'<tr><td>{_esc(str(v.version_number))}.0</td>'
            f'<td>{_esc(v.created_at.strftime("%d.%m.%Y"))}</td>'
            f'<td>{_esc(v.author_initials or "")}</td>'
            f'<td>{_esc(v.comment or "—")}</td></tr>')

    return (
        '<div class="page page--doc suivi-page">'
        f'<h1 style="{sec_css}">Identification</h1>'
        '<table class="doc-tbl meta-tbl"><tbody>'
        f'{ident_rows}</tbody></table>'
        f'<h1 style="{sec_css}">Révisions</h1>'
        '<table class="doc-tbl rev-tbl"><thead><tr>'
        f'<th style="background:{acc}">Version</th><th style="background:{acc}">Date</th>'
        f'<th style="background:{acc}">Par</th><th style="background:{acc}">Commentaire</th>'
        f'</tr></thead><tbody>{"".join(rev_rows)}</tbody></table>'
        '</div>')


def _toc_html(ctx, resolved):
    """Page « Table des matières » (placeholder d'aperçu, miroir du .docx)."""
    settings = ctx.document.template.settings or {}
    if not settings.get("include_toc", False):
        return ""
    sec_css = _heading_css(1, resolved)
    return (
        '<div class="page page--doc toc-page">'
        f'<h1 style="{sec_css}">Table des matières</h1>'
        '<p class="muted toc-hint">Le sommaire est généré automatiquement dans le '
        'document Word (clic droit → « Mettre à jour les champs », ou F9).</p>'
        '</div>')


def _doc_hf_html(ctx, is_footer):
    """En-tête / pied de page du document (aperçu Word/PDF/Lettre)."""
    settings = ctx.document.template.settings or {}
    conf = settings.get("footer" if is_footer else "header")
    if not conf or not conf.get("enabled", True):
        return ""
    pctx = placeholder_context(ctx)
    align = conf.get("align", "center" if is_footer else "left")
    parts = []
    if not is_footer and conf.get("show_logo"):
        uri = _logo_data_uri(ctx)
        if uri:
            parts.append(f'<img class="hf-logo" src="{uri}"/>')
    html = conf.get("html")
    if html and html.strip():
        parts.append(f'<div class="rich">{interpolate(html, pctx)}</div>')
    else:
        text = interpolate(conf.get("text", "") or "", pctx)
        if text.strip():
            parts.append("<div>" + _esc(text).replace(chr(10), "<br/>") + "</div>")
    if not parts:
        return ""
    cls = "doc-footer" if is_footer else "doc-header"
    return f'<div class="{cls}" style="text-align:{align}">{"".join(parts)}</div>'


def render(document, ctx):
    """Renvoie le HTML d'aperçu (bytes) selon le type de document, ou None."""
    from . import styles as STYLES
    doc_type = document.template.doc_type
    if doc_type == "a3":
        return None  # aperçu image (PNG) géré ailleurs
    try:
        resolved = STYLES.resolve(ctx)
    except Exception:
        resolved = {}
    acc = "#" + ((document.template.settings or {}).get("table_color") or "1F497D").lstrip("#")

    if doc_type == "xlsx":
        inner = _excel_html(ctx)
        body = f'<div class="page page--wide">{inner}</div>'
    elif doc_type == "pptx":
        body = _pptx_html(ctx)
    elif doc_type in ("md", "mail"):
        from ..services import markdown_to_html_page
        from . import md_gen
        return markdown_to_html_page(md_gen.render(ctx).decode("utf-8"))
    else:  # docx, pdf, lettre, mail, brochure (par blocs)
        cover = _cover_html(ctx, resolved)
        suivi = _suivi_html(ctx, resolved, acc)
        toc = _toc_html(ctx, resolved)
        inner = _blocks_html(ctx, resolved)
        header = _doc_hf_html(ctx, False)
        footer = _doc_hf_html(ctx, True)
        body = (f'{cover}{suivi}{toc}<div class="page page--doc">{header}'
                f'<div class="doc-body">{inner}</div>{footer}</div>')
    return _SHELL.format(acc=acc, body=body).encode("utf-8")
