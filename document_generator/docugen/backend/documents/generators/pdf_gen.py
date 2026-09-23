"""Générateurs PDF (reportlab)."""
import io

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm, mm
from reportlab.platypus import (
    BaseDocTemplate, Frame, Image, PageBreak, PageTemplate, Paragraph,
    Spacer, Table, TableStyle,
)

from .base import GenerationContext, resolve_value

PRIMARY = colors.HexColor("#2563EB")
DARK = colors.HexColor("#1E293B")
MUTED = colors.HexColor("#64748B")
LIGHT = colors.HexColor("#F1F5F9")

CONF_COLORS = {
    "public": colors.HexColor("#16A34A"),
    "internal": colors.HexColor("#2563EB"),
    "confidential": colors.HexColor("#EA580C"),
    "restricted": colors.HexColor("#DC2626"),
}


def _styles():
    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(
        "DGTitle", parent=styles["Title"], textColor=DARK, fontSize=22,
        spaceAfter=6))
    styles.add(ParagraphStyle(
        "DGSubtitle", parent=styles["Normal"], textColor=MUTED, fontSize=11,
        spaceAfter=18))
    styles.add(ParagraphStyle(
        "DGH2", parent=styles["Heading2"], textColor=PRIMARY, fontSize=14,
        spaceBefore=14, spaceAfter=6))
    styles.add(ParagraphStyle(
        "DGBody", parent=styles["Normal"], fontSize=10, leading=15,
        textColor=DARK))
    styles.add(ParagraphStyle(
        "DGSmall", parent=styles["Normal"], fontSize=8, textColor=MUTED))
    return styles


class _DocTemplate(BaseDocTemplate):
    """Gère l'en-tête, le pied de page et le filigrane de confidentialité."""

    def __init__(self, buffer, ctx: GenerationContext, **kw):
        self.ctx = ctx
        super().__init__(buffer, pagesize=A4, topMargin=3.2 * cm,
                         bottomMargin=2.2 * cm, leftMargin=2 * cm,
                         rightMargin=2 * cm, **kw)
        frame = Frame(self.leftMargin, self.bottomMargin,
                      self.width, self.height, id="main")
        self.addPageTemplates([
            PageTemplate(id="all", frames=[frame],
                         onPage=self._decorate)
        ])

    def _decorate(self, canvas, doc):
        ctx = self.ctx
        w, h = A4
        canvas.saveState()

        # --- En-tête ---
        canvas.setFillColor(PRIMARY)
        canvas.rect(0, h - 1.4 * cm, w, 1.4 * cm, fill=1, stroke=0)
        canvas.setFillColor(colors.white)
        canvas.setFont("Helvetica-Bold", 12)
        canvas.drawString(2 * cm, h - 0.95 * cm, ctx.company.name or "Entreprise")

        conf_color = CONF_COLORS.get(ctx.confidentiality, MUTED)
        label = ctx.confidentiality_label.upper()
        canvas.setFillColor(conf_color)
        badge_w = 3.8 * cm
        canvas.roundRect(w - 2 * cm - badge_w, h - 1.15 * cm, badge_w,
                         0.65 * cm, 3, fill=1, stroke=0)
        canvas.setFillColor(colors.white)
        canvas.setFont("Helvetica-Bold", 7)
        canvas.drawCentredString(w - 2 * cm - badge_w / 2, h - 0.72 * cm, label)

        # --- Filigrane pour les niveaux élevés ---
        if ctx.confidentiality in ("confidential", "restricted"):
            canvas.saveState()
            canvas.translate(w / 2, h / 2)
            canvas.rotate(45)
            canvas.setFont("Helvetica-Bold", 60)
            canvas.setFillColorRGB(0.9, 0.9, 0.9)
            canvas.drawCentredString(0, 0, label)
            canvas.restoreState()

        # --- Pied de page ---
        canvas.setStrokeColor(LIGHT)
        canvas.line(2 * cm, 1.6 * cm, w - 2 * cm, 1.6 * cm)
        canvas.setFont("Helvetica", 7)
        canvas.setFillColor(MUTED)
        footer = []
        if ctx.company.website_url:
            footer.append(ctx.company.website_url)
        if ctx.company.email:
            footer.append(ctx.company.email)
        if ctx.company.phone:
            footer.append(ctx.company.phone)
        canvas.drawString(2 * cm, 1.1 * cm, "  |  ".join(footer))
        canvas.drawRightString(
            w - 2 * cm, 1.1 * cm,
            f"v{ctx.version_number}  ·  Page {doc.page}")
        canvas.restoreState()


def _meta_table(ctx, styles):
    rows = [
        ["Projet", resolve_value(ctx, "project_name")],
        ["Client", resolve_value(ctx, "client_name")],
        ["Référence", resolve_value(ctx, "project_reference") or "—"],
        ["Confidentialité", ctx.confidentiality_label],
        ["Version", f"v{ctx.version_number}"],
    ]
    data = [[Paragraph(f"<b>{k}</b>", styles["DGBody"]),
             Paragraph(str(v), styles["DGBody"])] for k, v in rows]
    t = Table(data, colWidths=[4 * cm, None])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, -1), LIGHT),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LINEBELOW", (0, 0), (-1, -1), 0.4, colors.white),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
    ]))
    return t


def _contacts_block(ctx, styles):
    story = [Paragraph("Contacts", styles["DGH2"])]
    header = [["Rôle", "Nom", "Fonction", "Email", "Téléphone"]]
    body = []
    for c in ctx.client_contacts():
        body.append(["Client", c.full_name, c.role or "—",
                     c.email or "—", c.phone or "—"])
    for c in ctx.internal_contacts():
        body.append(["Interne", c.full_name, c.role or "—",
                     c.email or "—", c.phone or "—"])
    if not body:
        return [Paragraph("Contacts", styles["DGH2"]),
                Paragraph("Aucun contact renseigné.", styles["DGBody"])]
    t = Table(header + body, colWidths=[2 * cm, 3.5 * cm, 3 * cm, 4 * cm, 3 * cm])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), PRIMARY),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTSIZE", (0, 0), (-1, -1), 8),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, LIGHT]),
        ("GRID", (0, 0), (-1, -1), 0.3, colors.HexColor("#E2E8F0")),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    story.append(t)
    return story


def _history_block(ctx, styles):
    versions = ctx.document.versions.order_by("version_number")
    story = [Paragraph("Historique des versions", styles["DGH2"])]
    header = [["Version", "Date", "Auteur", "Confidentialité", "Commentaire"]]
    body = []
    for v in versions:
        body.append([
            f"v{v.version_number}",
            v.created_at.strftime("%d/%m/%Y %H:%M"),
            v.author_initials,
            dict_conf(v.confidentiality),
            Paragraph(v.comment or "—", styles["DGSmall"]),
        ])
    # inclut la version courante en cours de génération si non encore sauvée
    if not any(str(r[0]) == f"v{ctx.version_number}" for r in body):
        body.append([
            f"v{ctx.version_number}",
            "en cours",
            ctx.author_initials,
            ctx.confidentiality_label,
            Paragraph(ctx.comment or "—", styles["DGSmall"]),
        ])
    t = Table(header + body,
              colWidths=[1.6 * cm, 3 * cm, 1.8 * cm, 3 * cm, None])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), DARK),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 8),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, LIGHT]),
        ("GRID", (0, 0), (-1, -1), 0.3, colors.HexColor("#E2E8F0")),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    story.append(t)
    return story


def dict_conf(value):
    from documents.models import ConfidentialityLevel
    return dict(ConfidentialityLevel.choices).get(value, value)


def _company_footer_block(ctx, styles):
    c = ctx.company
    parts = []
    if c.description:
        parts.append(c.description)
    contact = []
    if c.address:
        contact.append(c.address.replace("\n", ", "))
    if c.phone:
        contact.append(f"Tél : {c.phone}")
    if c.email:
        contact.append(c.email)
    if contact:
        parts.append(" · ".join(contact))
    links = []
    if c.website_url:
        links.append(f'<a href="{c.website_url}">{c.website_url}</a>')
    if c.terms_url:
        links.append(f'<a href="{c.terms_url}">Conditions générales</a>')
    for lk in c.useful_links.all():
        links.append(f'<a href="{lk.url}">{lk.label}</a>')
    if links:
        parts.append(" | ".join(links))
    return [Paragraph(p, styles["DGSmall"]) for p in parts]


def generate(ctx: GenerationContext) -> bytes:
    """Génère un PDF de suivi de projet complet."""
    styles = _styles()
    buffer = io.BytesIO()
    doc = _DocTemplate(buffer, ctx)
    story = []

    title = resolve_value(ctx, "title", ctx.document.title)
    story.append(Paragraph(str(title), styles["DGTitle"]))
    subtitle = resolve_value(ctx, "subtitle",
                             f"{resolve_value(ctx, 'client_name')} — "
                             f"{resolve_value(ctx, 'project_name')}")
    story.append(Paragraph(str(subtitle), styles["DGSubtitle"]))

    story.append(_meta_table(ctx, styles))
    story.append(Spacer(1, 14))

    desc = resolve_value(ctx, "project_description")
    if desc:
        story.append(Paragraph("Description du projet", styles["DGH2"]))
        story.append(Paragraph(str(desc), styles["DGBody"]))

    # Sections libres définies via la variable "sections"
    sections = ctx.data.get("sections")
    if isinstance(sections, list):
        for sec in sections:
            heading = sec.get("heading") if isinstance(sec, dict) else None
            content = sec.get("content") if isinstance(sec, dict) else str(sec)
            if heading:
                story.append(Paragraph(str(heading), styles["DGH2"]))
            if content:
                story.append(Paragraph(str(content), styles["DGBody"]))

    # Tableau de suivi (jalons) via variable "milestones"
    milestones = ctx.data.get("milestones")
    if isinstance(milestones, list) and milestones:
        story.append(Paragraph("Suivi / Jalons", styles["DGH2"]))
        header = [["Jalon", "Échéance", "Statut", "Responsable"]]
        body = [[
            str(m.get("name", "")), str(m.get("due", "")),
            str(m.get("status", "")), str(m.get("owner", "")),
        ] for m in milestones if isinstance(m, dict)]
        t = Table(header + body, colWidths=[None, 3 * cm, 3 * cm, 3.5 * cm])
        t.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), PRIMARY),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 9),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, LIGHT]),
            ("GRID", (0, 0), (-1, -1), 0.3, colors.HexColor("#E2E8F0")),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ]))
        story.append(t)

    story.append(Spacer(1, 10))
    story += _contacts_block(ctx, styles)

    story.append(PageBreak())
    story += _history_block(ctx, styles)
    story.append(Spacer(1, 20))
    story += _company_footer_block(ctx, styles)

    doc.build(story)
    return buffer.getvalue()
