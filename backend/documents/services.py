"""Service de (re)génération de documents et de création des versions."""
import os
import re
from django.core.files.base import ContentFile
from django.db import transaction

from .generators.base import GenerationContext
from .generators.block_gen import BLOCK_RENDERERS
from .generators.registry import file_meta, get_generator
from .models import Document, DocumentVersion


def _slugify(value):
    value = re.sub(r"[^\w\s-]", "", str(value)).strip().lower()
    return re.sub(r"[-\s]+", "-", value) or "document"


def a3_export_format(document) -> str:
    """Format d'export d'un template A3 : 'pdf' (défaut) ou 'png'."""
    return ((document.template.settings or {}).get("a3_export") or "pdf")


def output_meta(document):
    """(ext, mime) du fichier produit, en tenant compte de l'export A3 PNG/PDF."""
    if document.doc_type == "a3" and a3_export_format(document) == "png":
        return file_meta("a3_png")
    return file_meta(document.doc_type)


@transaction.atomic
def render_content(document: Document, ctx) -> bytes:
    """Sélectionne le bon générateur et renvoie les octets du document produit."""
    excel_cfg = (document.template.settings or {}).get("excel", {})
    content = None
    generator = None
    if document.doc_type == "a3":
        from .generators import a3_gen
        if a3_export_format(document) == "png":
            return a3_gen.render_png(ctx)
        return a3_gen.render(ctx)
    if document.doc_type == "xlsx" and excel_cfg.get("sheets"):
        from .generators import excel_workbook
        generator = excel_workbook.render
    elif document.template.is_block_based:
        if document.doc_type == "pdf":
            # PDF IDENTIQUE AU WORD : .docx puis conversion via Microsoft Word.
            from .generators import pdf_convert
            from .generators.block_gen import render_docx
            use_conv = (document.template.settings or {}).get("pdf_from_docx", True)
            if use_conv and pdf_convert.available():
                try:
                    content = pdf_convert.docx_to_pdf(render_docx(ctx))
                except Exception:
                    content = None
            if content is None:
                generator = BLOCK_RENDERERS.get("pdf")
        else:
            generator = BLOCK_RENDERERS.get(document.doc_type)
            if generator is None:
                raise ValueError(
                    f"Type de document non pris en charge : {document.doc_type}")
    else:
        generator = get_generator(document.template.builder_key, document.doc_type)
    if content is None:
        content = generator(ctx)
    return content


def preview_document(document: Document):
    """Produit un aperçu (sans créer de version). Renvoie (content, ext, mime)."""
    ctx = GenerationContext.build(
        document,
        version_number=max(document.current_version, 1),
        data=document.data,
        author_initials="—",
        author_name="",
        comment="Aperçu",
        confidentiality=document.confidentiality,
    )
    content = render_content(document, ctx)
    ext, mime = output_meta(document)
    return content, ext, mime


def preview_inline(document: Document):
    """
    Aperçu portable pour affichage direct dans le navigateur.
    Renvoie (kind, mime, content_bytes) avec kind ∈ {'html', 'image', 'pdf'}.
    Aucune dépendance Word/LibreOffice, aucun fichier média intermédiaire.
    """
    ctx = GenerationContext.build(
        document,
        version_number=max(document.current_version, 1),
        data=document.data,
        author_initials="—",
        author_name="",
        comment="Aperçu",
        confidentiality=document.confidentiality,
    )
    doc_type = document.doc_type
    if doc_type == "a3":
        from .generators import a3_gen
        return "image", "image/png", a3_gen.render_png(ctx)
    from .generators import html_preview
    html = html_preview.render(document, ctx)
    if html is not None:
        return "html", "text/html", html
    # Repli ultime : vrai fichier, éventuellement converti en PDF si possible.
    content = render_content(document, ctx)
    ext, _mime = output_meta(document)
    if ext == ".pdf":
        return "pdf", "application/pdf", content
    pdf = to_pdf_for_preview(content, ext)
    if pdf is not None:
        return "pdf", "application/pdf", pdf
    return "html", "text/html", (
        "<!doctype html><meta charset='utf-8'>"
        "<p style='font-family:sans-serif;padding:2rem'>"
        "Aperçu indisponible pour ce format.</p>").encode("utf-8")


def to_pdf_for_preview(content: bytes, ext: str):
    """Convertit un document en PDF pour l'aperçu navigateur. (content_pdf | None)."""
    if ext == ".pdf":
        return content
    if ext in (".md", ".png"):
        # Markdown -> HTML ; PNG -> affiché nativement. Pas de conversion PDF.
        return None
    from .generators import pdf_convert
    if ext == ".docx" and pdf_convert.available():
        try:
            return pdf_convert.docx_to_pdf(content)
        except Exception:
            return None
    # Autres formats (pptx/xlsx) : conversion d'aperçu via LibreOffice si présent.
    import shutil
    import subprocess
    import tempfile
    soffice = shutil.which("soffice") or shutil.which("libreoffice")
    if not soffice:
        return None
    try:
        with tempfile.TemporaryDirectory() as tmp:
            src = os.path.join(tmp, "d" + ext)
            with open(src, "wb") as f:
                f.write(content)
            subprocess.run([soffice, "--headless", "--convert-to", "pdf",
                            "--outdir", tmp, src], check=True, capture_output=True, timeout=90)
            out = os.path.join(tmp, "d.pdf")
            if os.path.exists(out):
                with open(out, "rb") as f:
                    return f.read()
    except Exception:
        return None
    return None


def generate_version(document: Document, *, author_initials, author_name="",
                     comment="", confidentiality=None, data=None):
    """
    Génère une nouvelle version du document :
      1. incrémente le numéro de version,
      2. produit le fichier via le bon générateur,
      3. enregistre la DocumentVersion (fichier + instantané des données),
      4. met à jour le document (data / confidentialité / version courante).
    """
    document = Document.objects.select_for_update().get(pk=document.pk)

    if data is not None:
        document.data = data
    if confidentiality:
        document.confidentiality = confidentiality

    next_version = document.current_version + 1
    # Fiabilise : évite toute collision si current_version a dérivé
    from django.db.models import Max
    max_existing = (document.versions.aggregate(m=Max("version_number"))["m"] or 0)
    if next_version <= max_existing:
        next_version = max_existing + 1

    ctx = GenerationContext.build(
        document,
        version_number=next_version,
        data=document.data,
        author_initials=author_initials,
        author_name=author_name,
        comment=comment,
        confidentiality=document.confidentiality,
    )

    excel_cfg = (document.template.settings or {}).get("excel", {})
    content = render_content(document, ctx)

    ext, _mime = output_meta(document)
    filename = f"{_slugify(document.title)}-v{next_version}{ext}"

    version = DocumentVersion(
        document=document,
        version_number=next_version,
        comment=comment,
        author_initials=author_initials,
        author_name=author_name,
        confidentiality=document.confidentiality,
        data_snapshot=document.data,
    )
    version.file.save(filename, ContentFile(content), save=False)
    version.save()

    document.current_version = next_version
    document.save(update_fields=["current_version", "data", "confidentiality",
                                 "updated_at"])
    return version


def markdown_to_html_page(md_text: str) -> bytes:
    """Convertit du Markdown en page HTML autonome et stylée (pour l'aperçu)."""
    try:
        import markdown as _md
        body = _md.markdown(md_text, extensions=["tables", "fenced_code", "sane_lists"])
    except Exception:
        body = _basic_md_to_html(md_text)
    html = """<!doctype html><html lang="fr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  body{font-family:-apple-system,'Segoe UI',Inter,sans-serif;max-width:820px;margin:0 auto;padding:2.5rem 1.5rem;color:#1e293b;line-height:1.65}
  h1{font-size:2rem;border-bottom:2px solid #e2e8f0;padding-bottom:.3rem}
  h2{font-size:1.5rem;margin-top:2rem} h3{font-size:1.2rem}
  code{background:#f1f5f9;padding:.1rem .35rem;border-radius:4px;font-size:.9em}
  pre{background:#0f172a;color:#e2e8f0;padding:1rem;border-radius:8px;overflow:auto}
  pre code{background:transparent;color:inherit}
  table{border-collapse:collapse;width:100%;margin:1rem 0}
  th,td{border:1px solid #e2e8f0;padding:.5rem .75rem;text-align:left}
  th{background:#f8fafc}
  a{color:#4f46e5} blockquote{border-left:3px solid #cbd5e1;margin:0;padding-left:1rem;color:#64748b}
  @media(prefers-color-scheme:dark){body{background:#0b1120;color:#e2e8f0}th{background:#1e293b}th,td{border-color:#334155}code{background:#1e293b}}
</style></head><body>__BODY__</body></html>""".replace("__BODY__", body)
    return html.encode("utf-8")


def _basic_md_to_html(md):
    import html as _h
    import re
    lines = md.split("\n")
    out = []
    in_code = False
    in_table = False
    in_list = None
    def close_list():
        nonlocal in_list
        if in_list:
            out.append(f"</{in_list}>"); in_list = None
    def inline(t):
        t = _h.escape(t)
        t = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", t)
        t = re.sub(r"\*(.+?)\*", r"<em>\1</em>", t)
        t = re.sub(r"`(.+?)`", r"<code>\1</code>", t)
        t = re.sub(r"\[(.+?)\]\((.+?)\)", r'<a href="\2">\1</a>', t)
        return t
    i = 0
    while i < len(lines):
        ln = lines[i]
        if ln.strip().startswith("```"):
            if in_code:
                out.append("</code></pre>"); in_code = False
            else:
                close_list(); out.append("<pre><code>"); in_code = True
            i += 1; continue
        if in_code:
            out.append(_h.escape(ln)); i += 1; continue
        if ln.strip().startswith("|") and i + 1 < len(lines) and set(lines[i+1].replace("|", "").strip()) <= {"-", " ", ":"}:
            close_list()
            headers = [c.strip() for c in ln.strip().strip("|").split("|")]
            out.append("<table><thead><tr>" + "".join(f"<th>{inline(h)}</th>" for h in headers) + "</tr></thead><tbody>")
            i += 2
            while i < len(lines) and lines[i].strip().startswith("|"):
                cells = [c.strip() for c in lines[i].strip().strip("|").split("|")]
                out.append("<tr>" + "".join(f"<td>{inline(c)}</td>" for c in cells) + "</tr>")
                i += 1
            out.append("</tbody></table>"); continue
        m = re.match(r"^(#{1,6})\s+(.*)$", ln)
        if m:
            close_list(); lvl = len(m.group(1)); out.append(f"<h{lvl}>{inline(m.group(2))}</h{lvl}>"); i += 1; continue
        if re.match(r"^\s*[-*]\s+", ln):
            if in_list != "ul": close_list(); out.append("<ul>"); in_list = "ul"
            item = re.sub(r"^\s*[-*]\s+", "", ln)
            out.append("<li>" + inline(item) + "</li>"); i += 1; continue
        if re.match(r"^\s*\d+\.\s+", ln):
            if in_list != "ol": close_list(); out.append("<ol>"); in_list = "ol"
            item = re.sub(r"^\s*\d+\.\s+", "", ln)
            out.append("<li>" + inline(item) + "</li>"); i += 1; continue
        if ln.strip() == "":
            close_list(); i += 1; continue
        close_list(); out.append(f"<p>{inline(ln)}</p>"); i += 1
    if in_list: out.append(f"</{in_list}>")
    if in_code: out.append("</code></pre>")
    return "\n".join(out)
