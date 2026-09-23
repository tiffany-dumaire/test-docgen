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
