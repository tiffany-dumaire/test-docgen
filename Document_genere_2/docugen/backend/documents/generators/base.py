"""
Outils communs aux générateurs de documents.

Chaque générateur reçoit un objet `GenerationContext` construit à partir
du document, de sa version et du profil entreprise, puis renvoie les octets
du fichier produit.
"""
from dataclasses import dataclass, field
from typing import Any

from company.models import CompanyProfile
from documents.models import ConfidentialityLevel


@dataclass
class GenerationContext:
    document: Any
    version_number: int
    data: dict = field(default_factory=dict)
    author_initials: str = ""
    author_name: str = ""
    comment: str = ""
    confidentiality: str = ConfidentialityLevel.INTERNAL

    # Rempli automatiquement
    company: Any = None
    project: Any = None

    @classmethod
    def build(cls, document, version_number, data, *, author_initials="",
              author_name="", comment="", confidentiality=None):
        ctx = cls(
            document=document,
            version_number=version_number,
            data=data or {},
            author_initials=author_initials,
            author_name=author_name,
            comment=comment,
            confidentiality=confidentiality or document.confidentiality,
        )
        ctx.company = CompanyProfile.load()
        ctx.project = document.project
        return ctx

    @property
    def confidentiality_label(self):
        return dict(ConfidentialityLevel.choices).get(
            self.confidentiality, self.confidentiality
        )

    def client_contacts(self):
        return self.project.contacts.filter(kind="client")

    def internal_contacts(self):
        return self.project.contacts.filter(kind="internal")


def resolve_value(ctx: GenerationContext, key: str, default=""):
    """Récupère une variable dans data, avec repli sur les champs du projet."""
    if key in ctx.data:
        return ctx.data[key]
    mapping = {
        "project_name": ctx.project.name,
        "client_name": ctx.project.client_name,
        "project_description": ctx.project.description,
        "project_reference": ctx.project.reference,
        "company_name": ctx.company.name,
    }
    return mapping.get(key, default)


def placeholder_context(ctx: GenerationContext) -> dict:
    """Dictionnaire des variables disponibles pour l'interpolation {{clé}}."""
    from datetime import date

    values = {
        "project_name": ctx.project.name,
        "client_name": ctx.project.client_name,
        "project_reference": ctx.project.reference or "",
        "project_description": ctx.project.description or "",
        "company_name": ctx.company.name or "",
        "today": date.today().strftime("%d/%m/%Y"),
        "version": f"v{ctx.version_number}",
        "document_title": ctx.document.title,
        "confidentiality": ctx.confidentiality_label,
    }
    # Ajoute les valeurs des champs remplis (chaînes uniquement)
    for key, val in (ctx.data or {}).items():
        if isinstance(val, (str, int, float)):
            values[key] = str(val)
    return values


def interpolate(text: str, context: dict) -> str:
    """Remplace les {{clé}} par leur valeur ; laisse le reste intact."""
    import re

    if not text:
        return ""

    def repl(match):
        key = match.group(1).strip()
        return str(context.get(key, match.group(0)))

    return re.sub(r"\{\{\s*([\w.]+)\s*\}\}", repl, text)
