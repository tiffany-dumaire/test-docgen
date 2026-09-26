from django.core.management.base import BaseCommand

from company.models import CompanyProfile, UsefulLink
from documents.models import (ConfidentialityLevel, Document, DocumentTemplate,
                              DocumentType)
from documents.services import generate_version
from onlineforms.models import OnlineForm
from projects.models import Contact, Project

CV_SWISS_TEMPLATE = {
    "name": "CV — format suisse (Word)",
    "slug": "cv-suisse-word",
    "doc_type": DocumentType.DOCX,
    "builder_key": "custom",
    "is_block_based": True,
    "description": "Curriculum vitae au format suisse : informations "
                   "personnelles, expériences, formation, langues, compétences.",
    "schema": [
        {"id": "cv_photo", "type": "image", "asset_url": "",
         "width_pct": 25, "align": "right"},
        {"id": "cv_name", "type": "field", "key": "nom_complet",
         "label": "Prénom Nom", "field_type": "text", "show_label": False,
         "required": True},
        {"id": "cv_role", "type": "field", "key": "titre_poste",
         "label": "Titre / poste visé", "field_type": "text",
         "show_label": False},
        {"id": "cv_h_perso", "type": "heading", "level": 2,
         "text": "Informations personnelles"},
        {"id": "cv_perso", "type": "table", "key": "infos_perso", "label": "",
         "columns": [{"label": "Rubrique"}, {"label": "Détail"}]},
        {"id": "cv_h_exp", "type": "heading", "level": 2,
         "text": "Expériences professionnelles"},
        {"id": "cv_exp", "type": "table", "key": "experiences", "label": "",
         "columns": [{"label": "Période"}, {"label": "Entreprise"},
                     {"label": "Poste"}, {"label": "Missions"}]},
        {"id": "cv_h_edu", "type": "heading", "level": 2, "text": "Formation"},
        {"id": "cv_edu", "type": "table", "key": "formation", "label": "",
         "columns": [{"label": "Période"}, {"label": "Établissement"},
                     {"label": "Diplôme"}]},
        {"id": "cv_h_lang", "type": "heading", "level": 2, "text": "Langues"},
        {"id": "cv_lang", "type": "table", "key": "langues", "label": "",
         "columns": [{"label": "Langue"}, {"label": "Niveau"}]},
        {"id": "cv_h_skill", "type": "heading", "level": 2,
         "text": "Compétences informatiques"},
        {"id": "cv_skill", "type": "table", "key": "competences", "label": "",
         "columns": [{"label": "Domaine"}, {"label": "Outils / niveau"}]},
        {"id": "cv_h_int", "type": "heading", "level": 2,
         "text": "Centres d'intérêt"},
        {"id": "cv_int", "type": "field", "key": "interets",
         "label": "Centres d'intérêt", "field_type": "textarea",
         "show_label": False},
    ],
    "settings": {"include_cover": False, "include_suivi": False,
                 "include_toc": False, "pdf_from_docx": True},
}

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
        for tpl in SYSTEM_TEMPLATES + [SHOWCASE_TEMPLATE, EXCEL_WORKBOOK_TEMPLATE,
                                       CV_SWISS_TEMPLATE]:
            defaults = {**tpl, "is_system": True, "is_active": True}
            defaults.setdefault("settings", dict(DEFAULT_SETTINGS))
            obj, created = DocumentTemplate.objects.update_or_create(
                slug=tpl["slug"], defaults=defaults,
            )
            self.stdout.write(
                ("Créé" if created else "Mis à jour") + f" : {obj.name}")

        # --- Modèles Excel : migration vers le moteur « grille » ---
        from documents.generators.excel_convert import convert_sheets
        for xt in DocumentTemplate.objects.filter(doc_type="xlsx"):
            s = dict(xt.settings or {})
            excel = s.get("excel") or {}
            sheets = excel.get("sheets") or []
            if not sheets or "excel_legacy" in s:
                continue
            s["excel_legacy"] = excel
            s["excel"] = {"sheets": convert_sheets(sheets)}
            xt.settings = s
            xt.save(update_fields=["settings"])

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
            for cat, label, url in [
                ("Site web", "Site officiel", "https://www.acme-consulting.example"),
                ("Conditions générales", "CGV", "https://www.acme-consulting.example/cgv"),
                ("Support", "Support client", "https://support.acme-consulting.example"),
            ]:
                UsefulLink.objects.get_or_create(
                    company=company, label=label,
                    defaults={"url": url, "category": cat})
            self.stdout.write("Profil entreprise initialisé.")

        # --- Logo (officiel VNV) : rattaché si absent ---
        if not company.logo:
            import shutil
            from pathlib import Path

            from django.conf import settings as dj_settings
            src = (Path(dj_settings.BASE_DIR) / "documents" / "assets"
                   / "brand" / "vnv_logo.png")
            if src.exists():
                rel = "company/vnv_logo.png"
                dest = Path(dj_settings.MEDIA_ROOT) / rel
                dest.parent.mkdir(parents=True, exist_ok=True)
                shutil.copyfile(src, dest)
                company.logo = rel
                company.save(update_fields=["logo"])
                self.stdout.write("Logo entreprise initialisé.")

        # --- Thèmes globaux par type (charte VNV, déduits des modèles actuels) ---
        # global = base commune ; types = surcharges par type de document (docx,
        # pdf, pptx, xlsx, md, a3), appliquées à tous les modèles de ce type.
        if not company.styles:
            company.styles = {
                "global": {
                    "title": {"font": "Montserrat", "size": 26, "bold": True,
                              "color": "#EC6608"},
                    "subtitle": {"font": "Montserrat", "size": 14, "color": "#1D1E1B"},
                    "section": {"font": "Montserrat", "size": 16, "bold": True,
                                "color": "#EC6608"},
                    "h1": {"font": "Montserrat", "size": 18, "bold": True,
                           "color": "#1D1E1B"},
                    "h2": {"font": "Montserrat", "size": 15, "bold": True,
                           "color": "#1D1E1B"},
                    "h3": {"font": "Montserrat", "size": 13, "bold": True,
                           "color": "#EC6608"},
                    "paragraph": {"font": "Montserrat", "size": 11, "color": "#1D1E1B"},
                },
                "types": {
                    # Word : lettres, CV, offre d'emploi, document standard.
                    "docx": {
                        "title": {"color": "#1D1E1B"},
                        "h1": {"color": "#1D1E1B", "bold": True},
                        "h2": {"color": "#1D1E1B", "bold": True},
                        "h3": {"color": "#EC6608", "bold": True},
                        "paragraph": {"font": "Montserrat", "size": 11},
                    },
                    # PDF : suivi de projet, rapport d'enquête (accent orange).
                    "pdf": {
                        "title": {"color": "#EC6608", "bold": True},
                        "section": {"color": "#EC6608", "bold": True},
                        "h1": {"color": "#EC6608", "bold": True},
                        "h2": {"color": "#1D1E1B", "bold": True},
                    },
                    # PowerPoint : présentation standard, statut de projet.
                    "pptx": {
                        "title": {"color": "#EC6608", "size": 32, "bold": True},
                        "section": {"color": "#EC6608", "size": 20, "bold": True},
                        "h1": {"color": "#EC6608", "size": 24, "bold": True},
                        "paragraph": {"font": "Montserrat", "size": 16},
                    },
                    # Excel : cotation, note de frais, classeur (en-têtes orange).
                    "xlsx": {
                        "title": {"color": "#EC6608", "size": 16, "bold": True},
                    },
                    # Markdown : intertitres accentués.
                    "md": {
                        "title": {"color": "#EC6608", "bold": True},
                        "h1": {"color": "#EC6608", "bold": True},
                    },
                    # Template A3 : titres d'outils accentués.
                    "a3": {
                        "title": {"color": "#EC6608", "bold": True},
                        "h1": {"color": "#EC6608", "bold": True},
                    },
                },
            }
            company.save(update_fields=["styles"])
            self.stdout.write("Thèmes globaux par type initialisés (charte VNV).")

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

        # --- Collaborateurs (niveau entreprise) ---
        dev1, _ = TeamMember.objects.get_or_create(
            company=company, first_name="Paul", last_name="Martin",
            defaults={"role": "Lead développeur",
                      "email": "paul.martin@acme.example"})
        dev2, _ = TeamMember.objects.get_or_create(
            company=company, first_name="Sofia", last_name="Ndiaye",
            defaults={"role": "Développeuse full-stack",
                      "email": "sofia.ndiaye@acme.example"})
        designer, _ = TeamMember.objects.get_or_create(
            company=company, first_name="Léa", last_name="Fabre",
            defaults={"role": "Designer UI", "email": "lea.fabre@acme.example"})
        lead, _ = TeamMember.objects.get_or_create(
            company=company, first_name="Karim", last_name="Benali",
            defaults={"role": "Directeur technique",
                      "email": "karim.benali@acme.example"})

        # --- Équipes (avec hiérarchie et collaborateurs) ---
        direction, _ = Team.objects.get_or_create(
            company=company, name="Direction technique",
            defaults={"description": "Pilotage technique global.",
                      "color": "#6366F1"})
        direction.members.add(lead)
        team, _ = Team.objects.get_or_create(
            company=company, name="Équipe Développement",
            defaults={"description": "Ingénierie logicielle.",
                      "color": "#38BDF8"})
        team.members.add(dev1, dev2)
        if team.parent_id is None:
            team.parent = direction; team.save(update_fields=["parent"])
        design_team, _ = Team.objects.get_or_create(
            company=company, name="Équipe Design",
            defaults={"description": "UX / UI.", "color": "#A855F7"})
        design_team.members.add(designer)
        if design_team.parent_id is None:
            design_team.parent = direction
            design_team.save(update_fields=["parent"])
        # Un collaborateur peut appartenir à plusieurs équipes
        team.members.add(designer)

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
        # L'équipe Développement gère ce projet
        team.projects.add(project)
        design_team.projects.add(project)

        # Données de suivi de projet (pour les diagrammes de suivi)
        if not project.tracking:
            project.tracking = {
                "tasks": [
                    {"id": "t1", "name": "Cadrage", "start": "2026-01-05",
                     "end": "2026-01-20", "progress": 100, "planned_end": "2026-01-18",
                     "team": "Direction", "status": "done", "deps": []},
                    {"id": "t2", "name": "Design UI", "start": "2026-01-21",
                     "end": "2026-02-15", "progress": 80, "planned_end": "2026-02-10",
                     "team": "Design", "status": "in_progress", "deps": ["t1"]},
                    {"id": "t3", "name": "Développement", "start": "2026-02-10",
                     "end": "2026-04-10", "progress": 45, "planned_end": "2026-04-05",
                     "team": "Développement", "status": "in_progress", "deps": ["t2"]},
                    {"id": "t4", "name": "Recette", "start": "2026-04-11",
                     "end": "2026-04-30", "progress": 0, "planned_end": "2026-04-28",
                     "team": "Développement", "status": "late", "deps": ["t3"]},
                ],
                "milestones": [
                    {"name": "Kickoff", "planned": "2026-01-05", "actual": "2026-01-06"},
                    {"name": "Go-live", "planned": "2026-05-02", "actual": ""},
                ],
                "risks": [
                    {"name": "Retard fournisseur", "probability": 4, "impact": 5,
                     "status": "open", "action": "Relance hebdomadaire"},
                    {"name": "Périmètre flou", "probability": 3, "impact": 3,
                     "status": "mitigated", "action": "Atelier de cadrage"},
                ],
                "snapshots": [
                    {"date": "2026-01-31", "planned": 20, "actual": 18},
                    {"date": "2026-02-28", "planned": 45, "actual": 40},
                    {"date": "2026-03-31", "planned": 70, "actual": 58},
                ],
                "roadmap": [
                    {"title": "Phase 1 — Cadrage", "date": "2026-01"},
                    {"title": "Phase 2 — Build", "date": "2026-02"},
                    {"title": "Phase 3 — Recette", "date": "2026-04"},
                    {"title": "Lancement", "date": "2026-05"},
                ],
            }
            project.save(update_fields=["tracking"])

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

        # Modèle de formulaire démo (avec diagrammes)
        from onlineforms.models import FormTemplate
        ft_schema = [
            {"key": "satisfaction", "label": "Satisfaction globale",
             "type": "select", "required": True,
             "options": ["Faible", "Moyenne", "Élevée"]},
            {"key": "service", "label": "Service concerné", "type": "select",
             "options": ["Support", "Ventes", "Technique"]},
            {"key": "note", "label": "Note /10", "type": "number"},
        ]
        ft_diagrams = [
            {"id": "d1", "title": "Répartition de la satisfaction",
             "variant": "pie", "mode": "distribution", "question": "satisfaction"},
            {"id": "d2", "title": "Note moyenne par service", "variant": "bar",
             "mode": "crosstab", "group_by": "service", "value": "note",
             "agg": "avg", "color": "#4F81BD"},
        ]
        FormTemplate.objects.get_or_create(
            name="Enquête de satisfaction",
            defaults={
                "description": "Modèle réutilisable avec diagrammes exportables "
                               "(PNG / SVG) calculés à partir des réponses.",
                "schema": ft_schema, "diagrams": ft_diagrams,
            })
        self.stdout.write("Modèle de formulaire démo créé.")

        # Modèle « Template A3 » démo (affiche à positionnement libre)
        DocumentTemplate.objects.get_or_create(
            slug="affiche-a3-demo",
            defaults={
                "name": "Affiche projet A3", "doc_type": "a3",
                "builder_key": "a3", "is_block_based": False, "schema": [],
                "description": "Affiche A3 à positionnement libre, exportable "
                               "en PNG ou PDF.",
                "settings": {"a3_export": "png", "a3_pages": [
                    {"id": "p1", "name": "Affiche", "layout": {
                        "page_size": "a3", "orientation": "portrait",
                        "background": "#0F172A", "elements": [
                            {"id": "t1", "type": "text", "x": 60, "y": 160,
                             "w": 720, "h": 130, "text": "{{project_name}}",
                             "font": "title", "size": 60, "color": "#FFFFFF",
                             "align": "center", "bold": True},
                            {"id": "t2", "type": "text", "x": 60, "y": 300,
                             "w": 720, "h": 60, "text": "{{client_name}}",
                             "font": "subtitle", "size": 28, "color": "#93C5FD",
                             "align": "center"},
                        ]}}]},
            })
        self.stdout.write("Modèle Template A3 démo créé.")

        # --- Modèle CV suisse (Word) ---
        def _b(i, **kw):
            return {"id": f"cv{i}", **kw}
        cv_schema = [
            _b(1, type="logo", width_pct=22, align="right"),
            _b(2, type="heading", level=1, text="Curriculum Vitae"),
            _b(3, type="field", key="nom_prenom", label="Nom et prénom",
               field_type="text", show_label=True, required=True),
            _b(4, type="field", key="date_naissance", label="Date de naissance",
               field_type="date", show_label=True),
            _b(5, type="field", key="nationalite", label="Nationalité",
               field_type="text", show_label=True),
            _b(6, type="field", key="etat_civil", label="État civil",
               field_type="text", show_label=True),
            _b(7, type="field", key="permis", label="Permis de travail",
               field_type="text", show_label=True),
            _b(8, type="field", key="adresse", label="Adresse", field_type="textarea",
               show_label=True),
            _b(9, type="field", key="telephone", label="Téléphone", field_type="text",
               show_label=True),
            _b(10, type="field", key="email", label="E-mail", field_type="text",
               show_label=True),
            _b(11, type="heading", level=2, text="Profil"),
            _b(12, type="text", text="Résumé professionnel en quelques lignes."),
            _b(13, type="heading", level=2, text="Expérience professionnelle"),
            _b(14, type="table", label="",
               columns=[{"label": "Période"}, {"label": "Poste"},
                        {"label": "Entreprise"}, {"label": "Missions"}],
               allow_edit_columns=False),
            _b(15, type="heading", level=2, text="Formation"),
            _b(16, type="table", label="",
               columns=[{"label": "Période"}, {"label": "Diplôme"},
                        {"label": "Établissement"}], allow_edit_columns=False),
            _b(17, type="heading", level=2, text="Compétences"),
            _b(18, type="bullet_list", items=["Compétence 1", "Compétence 2",
                                              "Compétence 3"]),
            _b(19, type="heading", level=2, text="Langues"),
            _b(20, type="table", label="",
               columns=[{"label": "Langue"}, {"label": "Niveau"}],
               allow_edit_columns=False),
            _b(21, type="heading", level=2, text="Centres d'intérêt"),
            _b(22, type="text", text="Loisirs et centres d'intérêt."),
            _b(23, type="heading", level=2, text="Références"),
            _b(24, type="text", text="Disponibles sur demande."),
        ]
        DocumentTemplate.objects.get_or_create(
            slug="cv-suisse",
            defaults={
                "name": "CV suisse", "doc_type": "docx", "builder_key": "custom",
                "is_block_based": True, "schema": cv_schema,
                "description": "Modèle de CV au format suisse (Word) : photo, état "
                               "civil, permis, expérience, formation, langues.",
                "settings": {"include_cover": False, "include_suivi": False,
                             "include_toc": False, "table_color": "334155"},
            })
        self.stdout.write("Modèle CV suisse créé.")

        # --- Modèle de rapport statistiques (Word) lié à un formulaire ---
        report_schema = [
            {"id": "rp1", "type": "heading", "level": 1,
             "text": "Rapport statistiques — {{document_title}}"},
            {"id": "rp2", "type": "text",
             "text": "Synthèse des réponses collectées via le formulaire."},
            {"id": "rp3", "type": "heading", "level": 2,
             "text": "Répartition de la satisfaction"},
            {"id": "rp4", "type": "form_diagram", "diagram_key": "d1",
             "width_pct": 80, "align": "center"},
            {"id": "rp5", "type": "heading", "level": 2,
             "text": "Note moyenne par service"},
            {"id": "rp6", "type": "form_diagram", "diagram_key": "d2",
             "width_pct": 80, "align": "center"},
        ]
        report_tpl, _ = DocumentTemplate.objects.get_or_create(
            slug="rapport-enquete",
            defaults={
                "name": "Rapport enquête (statistiques)", "doc_type": "docx",
                "builder_key": "custom", "is_block_based": True,
                "schema": report_schema,
                "description": "Rapport Word intégrant les diagrammes d'un "
                               "formulaire comme variables (bloc « Diagramme de "
                               "formulaire », clés d1, d2…).",
                "settings": {"include_cover": False, "include_suivi": False,
                             "include_toc": False},
            })
        # Lie ce rapport au modèle de formulaire « Enquête de satisfaction »
        from onlineforms.models import FormTemplate as _FT
        _ft = _FT.objects.filter(name="Enquête de satisfaction").first()
        if _ft and not _ft.report_template_id:
            _ft.report_template = report_tpl
            _ft.save(update_fields=["report_template"])
        self.stdout.write("Modèle de rapport statistiques créé et lié.")

        # --- Outils d'analyse au format Template A3 ---
        from django.core.management import call_command
        call_command("seed_a3_tools")

        self.stdout.write(self.style.SUCCESS("Seed (démo) terminé."))
