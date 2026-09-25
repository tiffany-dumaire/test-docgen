"""Ajoute des modèles de document construits à partir des documents fournis :

  - « Offre d'emploi »        (Word, par blocs)   — d'après Job_Offer.docx
  - « Document standard — EN »(Word, par blocs)   — d'après Modèle de document standard - EN.dotx
  - « Modèle de cotation »    (Excel, classeur)   — d'après Modèle Cotation.xltx

Migration de données idempotente (update_or_create par slug). La réversion
supprime ces modèles uniquement s'ils ne sont référencés par aucun document.
"""
from django.db import migrations


# --- Offre d'emploi (Word) -------------------------------------------------
JOB_OFFER = {
    "slug": "offre-emploi-vnv",
    "name": "Offre d'emploi",
    "names": {"fr": "Offre d'emploi", "en": "Job offer",
              "de": "Stellenangebot", "it": "Offerta di lavoro"},
    "language": "fr",
    "languages": ["fr"],
    "doc_type": "docx",
    "builder_key": "custom",
    "is_block_based": True,
    "description": "Annonce de poste : titre, accroche, missions, prérequis, "
                   "présentation de l'entreprise et modalités de candidature.",
    "schema": [
        {"id": "jo_title", "type": "heading", "level": 1,
         "text": "Employé de commerce F/H 80%-100%"},
        {"id": "jo_intro1", "type": "text",
         "text": "Nous recherchons une/un employé/e de commerce, pour intégrer "
                 "notre département administratif à La Chaux-de-Fonds."},
        {"id": "jo_intro2", "type": "text",
         "text": "Tu rejoins l'équipe administrative de {{company_name}}, "
                 "participes à la gestion quotidienne des tâches administratives "
                 "et contribues au bon fonctionnement des bureaux."},
        {"id": "jo_h_do", "type": "heading", "level": 3,
         "text": "Ce que tu fais avancer"},
        {"id": "jo_do", "type": "bullet_list", "items": [
            "Tu as un rôle de soutien administratif pour les départements de l'entreprise",
            "Tu élabores des offres et les envoies aux clients",
            "Tu assures des tâches d'accueil et du courrier",
            "Tu suis l'intendance des bureaux",
            "Tu soutiens la comptabilité de l'entreprise",
        ]},
        {"id": "jo_h_req", "type": "heading", "level": 3,
         "text": "Pourquoi tu y parviens"},
        {"id": "jo_req", "type": "bullet_list", "items": [
            "CFC d'employé(e) de commerce ou formation jugée équivalente",
            "Trois années d'expérience professionnelle dans un service administratif",
            "De bonnes connaissances en comptabilité est un plus",
            "Très bonne connaissance des outils informatiques standards Microsoft Office",
            "Capacité à organiser et prioriser les tâches de façon pragmatique",
            "Excellente maîtrise du français ; l'anglais et/ou l'allemand oral sont un plus",
            "Aptitude à mener de front plusieurs tâches et à travailler en équipe",
            "Capacité d'adaptation",
        ]},
        {"id": "jo_h_who", "type": "heading", "level": 2,
         "text": "Qui nous sommes"},
        {"id": "jo_who", "type": "text",
         "text": "{{company_name}} est une entreprise d'informatique 100% suisse. "
                 "Efficience, réalisme et pragmatisme sont au cœur de notre approche."},
        {"id": "jo_h_apply", "type": "heading", "level": 2,
         "text": "Intéressé/e ?"},
        {"id": "jo_apply", "type": "text",
         "text": "Contacte-nous en envoyant ton CV, tes coordonnées complètes et "
                 "une lettre de motivation à {{company_email}}."},
    ],
    "settings": {"include_cover": False, "include_suivi": False,
                 "include_toc": False, "pdf_from_docx": True},
}


# --- Document standard — EN (Word) -----------------------------------------
STANDARD_DOC_EN = {
    "slug": "document-standard-en",
    "name": "Standard document",
    "names": {"en": "Standard document", "fr": "Document standard",
              "de": "Standarddokument", "it": "Documento standard"},
    "language": "en",
    "languages": ["en", "fr"],
    "doc_type": "docx",
    "builder_key": "custom",
    "is_block_based": True,
    "description": "Modèle de document technique standard : identification, "
                   "tableau des révisions, sommaire et introduction.",
    "schema": [
        {"id": "sd_title", "type": "heading", "level": 1, "text": "{{document_title}}"},
        {"id": "sd_subtitle", "type": "text", "text": "{{project_name}}"},
        {"id": "sd_h_id", "type": "heading", "level": 1, "text": "Identification"},
        {"id": "sd_client", "type": "field", "key": "client_name",
         "label": "Client", "field_type": "text", "show_label": True},
        {"id": "sd_project", "type": "field", "key": "project_name",
         "label": "Project", "field_type": "text", "show_label": True},
        {"id": "sd_sequence", "type": "field", "key": "sequence",
         "label": "Sequence", "field_type": "text", "show_label": True},
        {"id": "sd_owner", "type": "field", "key": "document_owner",
         "label": "Document owner", "field_type": "text", "show_label": True},
        {"id": "sd_class", "type": "field", "key": "classification",
         "label": "Classification", "field_type": "text", "show_label": True},
        {"id": "sd_h_rev", "type": "heading", "level": 1, "text": "Revisions"},
        {"id": "sd_rev", "type": "table", "key": "revisions", "label": "",
         "columns": [{"label": "Version"}, {"label": "Date"},
                     {"label": "By"}, {"label": "Comment"}]},
        {"id": "sd_h_intro", "type": "heading", "level": 1, "text": "Introduction"},
        {"id": "sd_intro", "type": "field", "key": "introduction",
         "label": "Introduction", "field_type": "textarea", "show_label": False},
    ],
    "settings": {"include_cover": True, "include_suivi": False,
                 "include_toc": True, "pdf_from_docx": True,
                 "cover_title": "{{document_title}}",
                 "cover_subtitle": "{{project_name}}"},
}


# --- Modèle de cotation (Excel) --------------------------------------------
COTATION = {
    "slug": "modele-cotation-vnv",
    "name": "Modèle de cotation",
    "names": {"fr": "Modèle de cotation", "en": "Quotation template",
              "de": "Kostenvoranschlag", "it": "Modello di preventivo"},
    "language": "fr",
    "languages": ["fr"],
    "doc_type": "xlsx",
    "builder_key": "excel_workbook",
    "is_block_based": False,
    "description": "Estimation chiffrée par module et fonction : fourchettes "
                   "basse/haute en jours-homme et en CHF, avec totaux.",
    "schema": [],
    "settings": {
        "excel": {
            "sheets": [
                {
                    "id": "cotation",
                    "name": "Cotation",
                    "title": "{{document_title}}",
                    "type": "table",
                    "show_totals": True,
                    "allow_add_rows": True,
                    "allow_add_columns": False,
                    "groups": [
                        {"label": "", "span": 2},
                        {"label": "Estimation (J/H)", "span": 2},
                        {"label": "Estimation (CHF)", "span": 2},
                    ],
                    "columns": [
                        {"key": "module", "label": "Module", "type": "text"},
                        {"key": "fonction", "label": "Fonction", "type": "text"},
                        {"key": "est_basse_jh", "label": "Est. basse (J/H)",
                         "type": "decimal", "decimals": 1},
                        {"key": "est_haute_jh", "label": "Est. haute (J/H)",
                         "type": "decimal", "decimals": 1},
                        {"key": "est_basse_chf", "label": "Est. basse (CHF)",
                         "type": "currency", "symbol": "CHF", "decimals": 2},
                        {"key": "est_haute_chf", "label": "Est. haute (CHF)",
                         "type": "currency", "symbol": "CHF", "decimals": 2},
                    ],
                },
                {
                    "id": "infos",
                    "name": "Informations",
                    "title": "Informations de l'offre",
                    "type": "info",
                    "items": [
                        {"label": "Titre de l'offre", "type": "text",
                         "value": "{{document_title}}"},
                        {"label": "Date", "type": "date", "value": "{{today}}"},
                        {"label": "Client", "type": "text", "value": "{{client_name}}"},
                        {"label": "Projet", "type": "text", "value": "{{project_name}}"},
                    ],
                },
            ]
        }
    },
}


ATTACHED_TEMPLATES = [JOB_OFFER, STANDARD_DOC_EN, COTATION]


def add_templates(apps, schema_editor):
    Template = apps.get_model("documents", "DocumentTemplate")
    for tpl in ATTACHED_TEMPLATES:
        defaults = {k: v for k, v in tpl.items() if k != "slug"}
        defaults["is_system"] = True
        defaults["is_active"] = True
        Template.objects.update_or_create(slug=tpl["slug"], defaults=defaults)


def remove_templates(apps, schema_editor):
    Template = apps.get_model("documents", "DocumentTemplate")
    from django.db.models import ProtectedError
    for tpl in ATTACHED_TEMPLATES:
        try:
            Template.objects.filter(slug=tpl["slug"], documents__isnull=True).delete()
        except ProtectedError:
            pass


class Migration(migrations.Migration):

    dependencies = [
        ("documents", "0011_documenttemplate_languages_documenttemplate_names_and_more"),
    ]

    operations = [
        migrations.RunPython(add_templates, remove_templates),
    ]
