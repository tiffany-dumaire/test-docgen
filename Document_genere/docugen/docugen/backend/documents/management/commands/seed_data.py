from django.core.management.base import BaseCommand

from company.models import CompanyProfile, UsefulLink
from documents.models import (ConfidentialityLevel, Document, DocumentTemplate,
                              DocumentType)
from documents.services import generate_version
from onlineforms.models import OnlineForm
from projects.models import Contact, Project

SYSTEM_TEMPLATES = [
    {
        "name": "Suivi de projet (PDF)",
        "slug": "suivi-projet-pdf",
        "doc_type": DocumentType.PDF,
        "builder_key": "project_tracking",
        "description": "Document PDF de suivi de projet avec jalons, contacts "
                       "et historique des versions.",
        "schema": [
            {"key": "title", "label": "Titre", "type": "text", "required": True},
            {"key": "subtitle", "label": "Sous-titre", "type": "text"},
            {"key": "sections", "label": "Sections libres", "type": "sections"},
            {"key": "milestones", "label": "Jalons", "type": "milestones"},
        ],
    },
    {
        "name": "Tableau générique (Excel)",
        "slug": "tableau-generique-excel",
        "doc_type": DocumentType.XLSX,
        "builder_key": "generic_table",
        "description": "Classeur Excel générique avec feuille d'informations, "
                       "feuille de données et historique.",
        "schema": [
            {"key": "table", "label": "Tableau (colonnes + lignes)",
             "type": "table", "required": True},
        ],
    },
    {
        "name": "Rapport d'analyse (Word)",
        "slug": "rapport-analyse-word",
        "doc_type": DocumentType.DOCX,
        "builder_key": "analysis_report",
        "description": "Document Word d'analyse avec résumé exécutif, sections "
                       "et recommandations.",
        "schema": [
            {"key": "title", "label": "Titre", "type": "text", "required": True},
            {"key": "summary", "label": "Résumé exécutif", "type": "textarea"},
            {"key": "sections", "label": "Sections", "type": "sections"},
            {"key": "recommendations", "label": "Recommandations",
             "type": "list"},
        ],
    },
]


class Command(BaseCommand):
    help = "Crée les modèles système, un profil entreprise et des données démo."

    def add_arguments(self, parser):
        parser.add_argument("--demo", action="store_true",
                            help="Ajoute un projet et des documents de démonstration.")

    def handle(self, *args, **options):
        # --- Modèles système ---
        for tpl in SYSTEM_TEMPLATES:
            obj, created = DocumentTemplate.objects.update_or_create(
                slug=tpl["slug"],
                defaults={**tpl, "is_system": True, "is_active": True},
            )
            self.stdout.write(
                ("Créé" if created else "Mis à jour") + f" : {obj.name}")

        # --- Profil entreprise ---
        company = CompanyProfile.load()
        if company.name in ("", "Mon entreprise"):
            company.name = "Acme Consulting"
            company.description = "Cabinet de conseil et d'ingénierie."
            company.website_url = "https://www.acme-consulting.example"
            company.terms_url = "https://www.acme-consulting.example/cgv"
            company.address = "12 rue de l'Exemple\n34000 Montpellier"
            company.phone = "+33 4 00 00 00 00"
            company.email = "contact@acme-consulting.example"
            company.save()
            UsefulLink.objects.get_or_create(
                company=company, label="Support",
                defaults={"url": "https://support.acme-consulting.example"})
            self.stdout.write("Profil entreprise initialisé.")

        if not options["demo"]:
            self.stdout.write(self.style.SUCCESS("Seed terminé."))
            return

        # --- Données de démonstration ---
        project, _ = Project.objects.get_or_create(
            name="Refonte du site web",
            defaults={
                "client_name": "Client Démo SAS",
                "description": "Refonte complète du site vitrine et du back-office.",
                "reference": "PRJ-2026-001",
            },
        )
        Contact.objects.get_or_create(
            project=project, kind=Contact.CLIENT, first_name="Marie",
            last_name="Durand", defaults={"role": "Directrice marketing",
                                          "email": "marie.durand@client.example"})
        Contact.objects.get_or_create(
            project=project, kind=Contact.INTERNAL, first_name="Paul",
            last_name="Martin", defaults={"role": "Chef de projet",
                                          "email": "paul.martin@acme.example"})

        pdf_tpl = DocumentTemplate.objects.get(slug="suivi-projet-pdf")
        doc, created = Document.objects.get_or_create(
            project=project, template=pdf_tpl, title="Suivi mensuel — Janvier",
            defaults={
                "confidentiality": ConfidentialityLevel.CONFIDENTIAL,
                "data": {
                    "title": "Suivi mensuel — Janvier 2026",
                    "sections": [{"heading": "Avancement",
                                  "content": "Phase de cadrage terminée à 100%."}],
                    "milestones": [
                        {"name": "Cadrage", "due": "15/01/2026",
                         "status": "Terminé", "owner": "Paul Martin"},
                        {"name": "Maquettes", "due": "05/02/2026",
                         "status": "En cours", "owner": "Studio design"},
                    ],
                },
            },
        )
        if created:
            generate_version(doc, author_initials="PM", author_name="Paul Martin",
                             comment="Version initiale")
            self.stdout.write("Document PDF démo généré.")

        # Formulaire démo
        form, fcreated = OnlineForm.objects.get_or_create(
            title="Recueil du besoin client",
            defaults={
                "project": project,
                "description": "Merci de préciser vos attentes.",
                "schema": [
                    {"key": "besoin", "label": "Votre besoin principal",
                     "type": "textarea", "required": True},
                    {"key": "budget", "label": "Budget estimé",
                     "type": "select", "required": False,
                     "options": ["< 10k€", "10-50k€", "> 50k€"]},
                    {"key": "email", "label": "Email de contact",
                     "type": "email", "required": True},
                ],
            },
        )
        if fcreated:
            form.ensure_short_link()
            self.stdout.write(
                f"Formulaire démo créé : lien /s/{form.short_link.code}")

        self.stdout.write(self.style.SUCCESS("Seed (démo) terminé."))
