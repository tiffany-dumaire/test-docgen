"""Générateur Markdown (.md) à partir du schéma par blocs."""
import re

from .base import GenerationContext, interpolate, placeholder_context


def _table_data(block, ctx):
    stored = (ctx.data or {}).get(block.get("key", "")) or {}
    columns = stored.get("columns") or [c.get("label", "") for c in block.get("columns", [])]
    rows = stored.get("rows", [])
    return columns, rows


def _html_to_md(html):
    """Conversion légère du texte enrichi HTML vers Markdown."""
    if not html:
        return ""
    s = html
    s = re.sub(r"<h1[^>]*>(.*?)</h1>", r"# \1\n", s, flags=re.S | re.I)
    s = re.sub(r"<h2[^>]*>(.*?)</h2>", r"## \1\n", s, flags=re.S | re.I)
    s = re.sub(r"<h3[^>]*>(.*?)</h3>", r"### \1\n", s, flags=re.S | re.I)
    s = re.sub(r"<(strong|b)>(.*?)</\1>", r"**\2**", s, flags=re.S | re.I)
    s = re.sub(r"<(em|i)>(.*?)</\1>", r"*\2*", s, flags=re.S | re.I)
    s = re.sub(r"<a[^>]*href=\"([^\"]+)\"[^>]*>(.*?)</a>", r"[\2](\1)", s, flags=re.S | re.I)
    s = re.sub(r"<li[^>]*>(.*?)</li>", r"- \1\n", s, flags=re.S | re.I)
    s = re.sub(r"</?(ul|ol)[^>]*>", "", s, flags=re.I)
    s = re.sub(r"<p[^>]*>(.*?)</p>", r"\1\n\n", s, flags=re.S | re.I)
    s = re.sub(r"<br\s*/?>", "\n", s, flags=re.I)
    s = re.sub(r"<[^>]+>", "", s)  # nettoie le reste
    return s.strip()


def render(ctx: GenerationContext) -> bytes:
    pctx = placeholder_context(ctx)
    cfg = ctx.document.template.settings or {}
    out = []

    # Titre principal (page de garde simplifiée)
    if cfg.get("include_cover", True):
        title = interpolate(cfg.get("cover_title", "{{document_title}}"), pctx)
        subtitle = interpolate(cfg.get("cover_subtitle", "{{client_name}} — {{project_name}}"), pctx)
        out.append(f"# {title}\n")
        if subtitle:
            out.append(f"_{subtitle}_\n")
        out.append("")

    for block in ctx.document.template.schema or []:
        bt = block.get("type")
        if bt == "heading":
            lvl = min(int(block.get("level", 2)), 6)
            out.append(f"{'#' * lvl} {interpolate(block.get('text', ''), pctx)}\n")
        elif bt == "text":
            out.append(interpolate(block.get("text", ""), pctx) + "\n")
        elif bt == "richtext":
            out.append(_html_to_md(interpolate(block.get("text", ""), pctx)) + "\n")
        elif bt in ("bullet_list", "numbered_list"):
            items = block.get("items") or [l for l in interpolate(block.get("text", ""), pctx).split("\n") if l.strip()]
            for i, it in enumerate(items, 1):
                prefix = f"{i}." if bt == "numbered_list" else "-"
                out.append(f"{prefix} {interpolate(str(it), pctx)}")
            out.append("")
        elif bt == "code":
            out.append("```\n" + interpolate(block.get("text", ""), pctx) + "\n```\n")
        elif bt == "link":
            url = interpolate(block.get("url", ""), pctx)
            label = interpolate(block.get("label", "") or url, pctx)
            out.append(f"[{label}]({url})\n")
        elif bt == "image":
            url = block.get("asset_url", "")
            if url:
                out.append(f"![image]({url})\n")
        elif bt == "table":
            columns, rows = _table_data(block, ctx)
            if block.get("label"):
                out.append(f"**{block['label']}**\n")
            if columns:
                out.append("| " + " | ".join(str(c) for c in columns) + " |")
                out.append("| " + " | ".join("---" for _ in columns) + " |")
                for r in rows:
                    cells = [("" if c is None else str(c)) for c in (list(r) + [""] * len(columns))[:len(columns)]]
                    out.append("| " + " | ".join(cells) + " |")
                out.append("")
        elif bt == "contacts":
            out.append("**Contacts**\n")
            scope = block.get("scope", "both")
            contacts = []
            if scope in ("client", "both"):
                contacts += [("Client", c) for c in ctx.client_contacts()]
            if scope in ("internal", "both"):
                contacts += [("Interne", c) for c in ctx.internal_contacts()]
            if contacts:
                out.append("| Rôle | Nom | Fonction | Email |")
                out.append("| --- | --- | --- | --- |")
                for kind, c in contacts:
                    out.append(f"| {kind} | {c.full_name} | {c.role or '—'} | {c.email or '—'} |")
                out.append("")
        elif bt == "spacer":
            out.append("")

    return ("\n".join(out).rstrip() + "\n").encode("utf-8")
