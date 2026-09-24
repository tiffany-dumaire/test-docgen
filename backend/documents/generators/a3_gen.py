"""
Générateur « Template A3 » : pages à positionnement libre (A3 ou A4),
exportables en PDF (vectoriel) ou en PNG (rastérisé).

Un modèle A3 stocke ses pages dans `settings["a3_pages"]` :
    [{ "id": "...", "name": "Page 1", "layout": { <spec layout_render> } }, ...]

Rétro-compatibilité : si `a3_pages` est absent mais qu'une mise en page libre
« page » existe dans `settings["layouts"]["page"]`, elle est utilisée comme
page unique.

Sorties :
  - render(ctx)      -> PDF (toutes les pages)
  - render_png(ctx)  -> PNG de la 1re page (aperçu)
  - render_pngs(ctx) -> liste de PNG (une par page)
"""
import io

from . import layout_render as LR


def _pages(ctx):
    settings = (ctx.document.template.settings or {})
    pages = settings.get("a3_pages")
    if pages:
        return [p for p in pages if isinstance(p, dict) and p.get("layout")]
    # Repli : mise en page libre « page »
    layouts = settings.get("layouts") or {}
    page = layouts.get("page")
    if page and page.get("elements"):
        return [{"id": "page", "name": "Page", "layout": page}]
    # Page vide par défaut (évite un fichier corrompu)
    return [{"id": "page", "name": "Page", "layout": {"page_size": "a3",
                                                      "elements": []}}]


def render(ctx) -> bytes:
    """PDF multi-pages, une page par mise en page libre."""
    from reportlab.pdfgen import canvas as pdfcanvas

    buf = io.BytesIO()
    c = None
    for pg in _pages(ctx):
        layout = pg["layout"]
        pw, ph = LR.page_dims(layout)
        if c is None:
            c = pdfcanvas.Canvas(buf, pagesize=(pw, ph))
        else:
            c.setPageSize((pw, ph))
        LR.draw_on_canvas(c, layout, ctx, pw, ph)
        c.showPage()
    c.save()
    return buf.getvalue()


def render_pngs(ctx):
    """Renvoie une liste de (bytes_png, w_px, h_px), une par page."""
    out = []
    for pg in _pages(ctx):
        out.append(LR.render_png(pg["layout"], ctx))
    return out


def render_png(ctx) -> bytes:
    """PNG de la première page (pour l'aperçu)."""
    pngs = render_pngs(ctx)
    return pngs[0][0] if pngs else b""
