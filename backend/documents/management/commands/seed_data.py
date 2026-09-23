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
        "builder_key": "custom",
        "is_block_based": True,
        "description": "Document PDF de suivi de projet : résumé, jalons et "
                       "contacts. Personnalisable dans l'éditeur de modèles.",
        "schema": [
            {"id": "b1", "type": "heading", "level": 1,
             "text": "{{project_name}} — Suivi de projet"},
            {"id": "b2", "type": "paragraph",
             "text": "Client : {{client_name}}   ·   Référence : "
                     "{{project_reference}}   ·   {{today}}"},
            {"id": "b3", "type": "heading", "level": 2, "text": "Résumé"},
            {"id": "b4", "type": "field", "key": "resume",
             "label": "Résumé de la période", "field_type": "textarea",
             "required": False, "show_label": False},
            {"id": "b5", "type": "heading", "level": 2, "text": "Jalons"},
            {"id": "b6", "type": "table", "key": "jalons", "label": "",
             "columns": [{"label": "Jalon"}, {"label": "Échéance"},
                         {"label": "Statut"}, {"label": "Responsable"}]},
            {"id": "b7", "type": "contacts", "scope": "both",
             "label": "Contacts"},
        ],
    },
    {
        "name": "Tableau générique (Excel)",
        "slug": "tableau-generique-excel",
        "doc_type": DocumentType.XLSX,
        "builder_key": "custom",
        "is_block_based": True,
        "description": "Classeur Excel générique : un tableau libre à remplir "
                       "façon tableur (ajout de colonnes et de lignes).",
        "schema": [
            {"id": "b1", "type": "heading", "level": 1,
             "text": "{{document_title}}"},
            {"id": "b2", "type": "table", "key": "donnees",
             "label": "Données", "allow_edit_columns": True,
             "columns": [{"label": "Colonne 1"}, {"label": "Colonne 2"}]},
        ],
    },
    {
        "name": "Rapport d'analyse (Word)",
        "slug": "rapport-analyse-word",
        "doc_type": DocumentType.DOCX,
        "builder_key": "custom",
        "is_block_based": True,
        "description": "Document Word d'analyse : résumé exécutif, analyse et "
                       "recommandations.",
        "schema": [
            {"id": "b1", "type": "heading", "level": 1,
             "text": "{{project_name}} — Analyse"},
            {"id": "b2", "type": "heading", "level": 2,
             "text": "Résumé exécutif"},
            {"id": "b3", "type": "field", "key": "resume",
             "label": "Résumé exécutif", "field_type": "textarea",
             "show_label": False},
            {"id": "b4", "type": "heading", "level": 2, "text": "Analyse"},
            {"id": "b5", "type": "field", "key": "analyse", "label": "Analyse",
             "field_type": "textarea", "show_label": False},
            {"id": "b6", "type": "heading", "level": 2,
             "text": "Recommandations"},
            {"id": "b7", "type": "table", "key": "reco", "label": "",
             "columns": [{"label": "Recommandation"}, {"label": "Priorité"}]},
        ],
    },
]


DEFAULT_SETTINGS = {
    "cover_title": "{{document_title}}",
    "cover_subtitle": "{{client_name}} — {{project_name}}",
    "include_cover": True,
    "include_suivi": True,
    "include_toc": True,
}

SHOWCASE_TEMPLATE = {
    "name": "Document structuré (Word)",
    "slug": "document-structure-word",
    "doc_type": DocumentType.DOCX,
    "builder_key": "custom",
    "is_block_based": True,
    "description": "Exemple complet : logo, titres, listes, texte enrichi, "
                   "tableau, bloc de code et lien — conforme au modèle.",
    "settings": {
        "cover_title": "{{document_title}}",
        "cover_subtitle": "{{client_name}} — {{project_name}}",
        "include_cover": True, "include_suivi": True, "include_toc": True,
    },
    "schema": [
        {"id": "s1", "type": "logo", "width_pct": 30, "align": "left"},
        {"id": "s2", "type": "heading", "level": 1, "text": "Introduction"},
        {"id": "s3", "type": "text",
         "text": "Ce document a été généré pour {{client_name}} dans le cadre "
                 "du projet {{project_name}} (réf. {{project_reference}})."},
        {"id": "s4", "type": "heading", "level": 2, "text": "Objectifs"},
        {"id": "s5", "type": "bullet_list",
         "items": ["Cadrer le besoin", "Définir le périmètre", "Planifier"]},
        {"id": "s6", "type": "heading", "level": 2, "text": "Étapes"},
        {"id": "s7", "type": "numbered_list",
         "items": ["Analyse", "Conception", "Réalisation", "Recette"]},
        {"id": "s8", "type": "heading", "level": 2, "text": "Notes libres"},
        {"id": "s9", "type": "richtext", "key": "notes",
         "label": "Notes",
         "text": "<p>Saisissez ici du <b>texte riche</b>.</p>"},
        {"id": "s10", "type": "heading", "level": 2, "text": "Budget"},
        {"id": "s11", "type": "table", "key": "budget", "label": "",
         "allow_edit_columns": True,
         "columns": [{"label": "Poste"}, {"label": "Montant"}]},
        {"id": "s12", "type": "heading", "level": 2, "text": "Exemple de code"},
        {"id": "s13", "type": "code",
         "text": "curl -X POST /api/documents/{id}/generate/"},
        {"id": "s14", "type": "link", "label": "Voir le site",
         "url": "{{company_name}}"},
        {"id": "s15", "type": "contacts", "scope": "both", "label": "Contacts"},
    ],
}


EXCEL_WORKBOOK_TEMPLATE = {
    "name": "Classeur multi-onglets (Excel)",
    "slug": "classeur-multi-onglets-excel",
    "doc_type": DocumentType.XLSX,
    "builder_key": "excel_workbook",
    "is_block_based": False,
    "description": "Classeur Excel personnalisable : onglets à colonnes typées et "
                   "regroupées, tableau croisé et informations fixes.",
    "settings": {
        "excel": {
            "sheets": [
                {
                    "id": "clients",
                    "name": "Clients",
                    "title": "{{document_title}}",
                    "type": "table",
                    "show_totals": True,
                    "allow_add_rows": True,
                    "allow_add_columns": True,
                    "groups": [
                        {"label": "Entreprise", "span": 3},
                        {"label": "Chiffres", "span": 2},
                    ],
                    "columns": [
                        {"key": "nom", "label": "Nom", "type": "text"},
                        {"key": "adresse", "label": "Adresse", "type": "text"},
                        {"key": "localite", "label": "Localité", "type": "text"},
                        {"key": "ca", "label": "Chiffre d'affaires",
                         "type": "currency", "symbol": "€", "decimals": 2},
                        {"key": "statut", "label": "Statut", "type": "text"},
                    ],
                },
                {
                    "id": "synthese",
                    "name": "Synthèse (croisé)",
                    "title": "Chiffre d'affaires par localité et statut",
                    "type": "pivot",
                    "pivot": {
                        "source": "clients",
                        "row_field": "localite",
                        "col_field": "statut",
                        "value_field": "ca",
                        "agg": "sum",
                        "value_type": "currency",
                        "symbol": "€", "decimals": 2,
                    },
                },
                {
                    "id": "infos",
                    "name": "Informations",
                    "title": "Informations du document",
                    "type": "info",
                    "items": [
                        {"label": "Date d'édition", "type": "date",
                         "value": "{{today}}"},
                        {"label": "Client", "type": "text",
                         "value": "{{client_name}}"},
                        {"label": "Projet", "type": "text",
                         "value": "{{project_name}}"},
                        {"label": "Budget alloué", "type": "currency",
                         "symbol": "€", "decimals": 2, "value": 50000},
                        {"label": "Nombre de lots", "type": "integer",
                         "value": 4},
                        {"label": "Taux d'avancement", "type": "percent",
                         "value": 35},
                        {"label": "Coefficient", "type": "decimal",
                         "decimals": 2, "value": 1.25},
                    ],
                },
            ]
        }
    },
    "schema": [],
}


class Command(BaseCommand):
    help = "Crée les modèles système, un profil entreprise et des données démo."

    def add_arguments(self, parser):
        parser.add_argument("--demo", action="store_true",
                            help="Ajoute un projet et des documents de démonstration.")

    def handle(self, *args, **options):
        # --- Modèles système ---
        for tpl in SYSTEM_TEMPLATES + [SHOWCASE_TEMPLATE, EXCEL_WORKBOOK_TEMPLATE]:
            defaults = {**tpl, "is_system": True, "is_active": True}
            defaults.setdefault("settings", dict(DEFAULT_SETTINGS))
            obj, created = DocumentTemplate.objects.update_or_create(
                slug=tpl["slug"], defaults=defaults,
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
        from projects.models import Client, ProjectAssignment
        from company.models import Team, TeamMember

        client, _ = Client.objects.get_or_create(
            name="Client Démo SAS",
            defaults={"contact_name": "Marie Durand",
                      "email": "contact@client-demo.example",
                      "phone": "+33 1 23 45 67 89",
                      "address": "10 avenue des Champs\n75008 Paris"})
        Client.objects.get_or_create(
            name="Mairie de Nice",
            defaults={"contact_name": "Jean Bono",
                      "email": "dsi@nice.example"})

        team, _ = Team.objects.get_or_create(
            company=company, name="Équipe Développement",
            defaults={"description": "Ingénierie logicielle."})
        dev1, _ = TeamMember.objects.get_or_create(
            team=team, first_name="Paul", last_name="Martin",
            defaults={"role": "Lead développeur",
                      "email": "paul.martin@acme.example"})
        dev2, _ = TeamMember.objects.get_or_create(
            team=team, first_name="Sofia", last_name="Ndiaye",
            defaults={"role": "Développeuse full-stack",
                      "email": "sofia.ndiaye@acme.example"})
        design_team, _ = Team.objects.get_or_create(
            company=company, name="Équipe Design",
            defaults={"description": "UX / UI."})
        TeamMember.objects.get_or_create(
            team=design_team, first_name="Léa", last_name="Fabre",
            defaults={"role": "Designer UI", "email": "lea.fabre@acme.example"})

        # --- Projet de démonstration (rattaché au client + équipe) ---
        project, _ = Project.objects.get_or_create(
            name="Refonte du site web",
            defaults={
                "client_name": "Client Démo SAS",
                "client": client,
                "description": "Refonte complète du site vitrine et du back-office.",
                "reference": "PRJ-2026-001",
            },
        )
        if project.client_id is None:
            project.client = client; project.save(update_fields=["client"])
        ProjectAssignment.objects.get_or_create(
            project=project, member=dev1, defaults={"role": "Chef de projet"})
        ProjectAssignment.objects.get_or_create(
            project=project, member=dev2, defaults={"role": "Développement"})
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
                    "resume": "Phase de cadrage terminée à 100 %. Les maquettes "
                              "sont en cours de validation.",
                    "jalons": {
                        "columns": ["Jalon", "Échéance", "Statut", "Responsable"],
                        "rows": [
                            ["Cadrage", "15/01/2026", "Terminé", "Paul Martin"],
                            ["Maquettes", "05/02/2026", "En cours", "Studio design"],
                        ],
                    },
                },
            },
        )
        if created:
            generate_version(doc, author_initials="PM", author_name="Paul Martin",
                             comment="Version initiale")
            self.stdout.write("Document PDF démo généré.")

        # Document Excel personnalisé démo
        xls_tpl = DocumentTemplate.objects.get(slug="classeur-multi-onglets-excel")
        xdoc, xcreated = Document.objects.get_or_create(
            project=project, template=xls_tpl, title="Portefeuille clients",
            defaults={
                "confidentiality": ConfidentialityLevel.INTERNAL,
                "data": {
                    "sheets": {
                        "clients": {
                            "rows": [
                                ["Alpha SARL", "1 rue A", "Lyon", "12000", "Actif"],
                                ["Beta SA", "2 av. B", "Paris", "48000", "Prospect"],
                                ["Gamma SAS", "3 bd C", "Lyon", "9500", "Actif"],
                                ["Delta Inc", "4 imp. D", "Paris", "26000", "Actif"],
                                ["Epsilon", "5 pl. E", "Nice", "15000", "Prospect"],
                            ]
                        }
                    }
                },
            },
        )
        if xcreated:
            generate_version(xdoc, author_initials="PM", author_name="Paul Martin",
                             comment="Version initiale")
            self.stdout.write("Document Excel personnalisé démo généré.")

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
