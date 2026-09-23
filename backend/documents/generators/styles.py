"""
Styles en cascade appliqués à la génération des documents.

Hiérarchie d'héritage (du plus général au plus spécifique) :
    Entreprise (CompanyProfile.styles)
      → Projet (Project.styles)           (hérite + surcharge)
        → Modèle (template.settings["styles"])

Chaque niveau ne renseigne QUE ce qu'il surcharge : un élément non défini garde
le style de base du modèle Word (Modèle.docx), ce qui préserve la charte par
défaut. Un modèle peut ainsi :
  - ne rien surcharger (tout hérité de l'entreprise / du projet) ;
  - ré-sélectionner le style entreprise pour un élément (= ne pas le surcharger) ;
  - définir des styles totalement personnalisés (surcharge complète).

Éléments stylables : title, subtitle, section, h1..h5, paragraph.
Propriétés : font (nom de police), size (pt), bold, italic, color (#hex),
align (left|center|right|justify), space_after (pt).
"""
from . import housestyle as HS

ELEMENTS = ["title", "subtitle", "section", "h1", "h2", "h3", "h4", "h5", "paragraph"]

# Valeur d'ID de style Word -> clé d'élément logique
_ID_TO_ELEMENT = {v: k for k, v in HS.DOCX_STYLE_IDS.items()}
_ID_TO_ELEMENT[HS.DOCX_STYLE_IDS["normal"]] = "paragraph"


def element_for_style_id(style_id):
    return _ID_TO_ELEMENT.get(style_id)


def _merge(base, override):
    out = dict(base)
    for el, props in (override or {}).items():
        if not isinstance(props, dict):
            continue
        cur = dict(out.get(el, {}))
        cur.update({k: v for k, v in props.items() if v not in (None, "")})
        out[el] = cur
    return out


def resolve(ctx):
    """Fusionne les styles entreprise → projet → modèle pour ce document."""
    company = getattr(ctx.company, "styles", None) or {}
    project = getattr(ctx.project, "styles", None) or {}
    template = (ctx.document.template.settings or {}).get("styles") or {}
    resolved = _merge({}, company)
    resolved = _merge(resolved, project)
    resolved = _merge(resolved, template)
    return resolved


def apply(paragraph, element_key, resolved):
    """Applique le style résolu d'un élément sur un paragraphe déjà créé."""
    if not element_key:
        return
    props = (resolved or {}).get(element_key)
    if not props:
        return
    from docx.enum.text import WD_ALIGN_PARAGRAPH
    from docx.shared import Pt, RGBColor

    align_map = {
        "left": WD_ALIGN_PARAGRAPH.LEFT, "center": WD_ALIGN_PARAGRAPH.CENTER,
        "right": WD_ALIGN_PARAGRAPH.RIGHT, "justify": WD_ALIGN_PARAGRAPH.JUSTIFY,
    }
    if props.get("align") in align_map:
        paragraph.paragraph_format.alignment = align_map[props["align"]]
    if props.get("space_after") is not None:
        try:
            paragraph.paragraph_format.space_after = Pt(float(props["space_after"]))
        except (TypeError, ValueError):
            pass

    color = None
    if props.get("color"):
        try:
            color = RGBColor.from_string(str(props["color"]).lstrip("#").upper())
        except ValueError:
            color = None
    size = None
    if props.get("size"):
        try:
            size = Pt(float(props["size"]))
        except (TypeError, ValueError):
            size = None

    for run in paragraph.runs:
        if props.get("font"):
            run.font.name = props["font"]
        if size is not None:
            run.font.size = size
        if "bold" in props:
            run.font.bold = bool(props["bold"])
        if "italic" in props:
            run.font.italic = bool(props["italic"])
        if color is not None:
            run.font.color.rgb = color
