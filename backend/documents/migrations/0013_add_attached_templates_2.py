"""Ajoute une seconde série de modèles construits à partir des documents fournis :

  - « Note de frais »            (Excel)      — Modèle de note de frais.xltx
  - « Présentation standard »    (PowerPoint) — Modèle de présentation - Corps Roboto.potx
  - « Statut de projet »         (PowerPoint) — Statut de projet.potx
  - « Lettre »                   (Word)       — Modèle Lettre VNV.docx
  - « Lettre — envoi de contrat »(Word)       — Modèle Lettre VNV Envoi contrat.docx

Chaque modèle est multilingue (noms fr/en/de/it, point 5). Migration de données
idempotente ; réversion sûre (suppression seulement si aucun document lié).
"""
from django.db import migrations


NOTE_DE_FRAIS = {
    "slug": "note-de-frais-vnv",
    "name": "Note de frais",
    "names": {"fr": "Note de frais", "en": "Expense report",
              "de": "Spesenabrechnung", "it": "Nota spese"},
    "language": "fr", "languages": ["fr", "en", "de", "it"],
    "doc_type": "xlsx", "builder_key": "excel_workbook", "is_block_based": False,
    "description": "Note de frais : déplacements (transports publics / voiture), "
                   "logement, repas et autres frais, avec totaux.",
    "schema": [],
    "settings": {
        "excel": {
            "sheets": [
                {
                    "id": "frais", "name": "Note de frais",
                    "title": "{{document_title}}", "type": "table",
                    "show_totals": True, "allow_add_rows": True,
                    "allow_add_columns": False,
                    "groups": [
                        {"label": "", "span": 2},
                        {"label": "Transport", "span": 2},
                        {"label": "Frais", "span": 4},
                    ],
                    "columns": [
                        {"key": "date", "label": "Date", "type": "date"},
                        {"key": "lieu", "label": "Lieu", "type": "text"},
                        {"key": "transport_public", "label": "Transports publics (CHF)",
                         "type": "currency", "symbol": "CHF", "decimals": 2},
                        {"key": "voiture_km", "label": "Voiture perso. (km)",
                         "type": "decimal", "decimals": 0},
                        {"key": "logement", "label": "Logement (CHF)",
                         "type": "currency", "symbol": "CHF", "decimals": 2},
                        {"key": "repas", "label": "Repas (CHF)",
                         "type": "currency", "symbol": "CHF", "decimals": 2},
                        {"key": "autres_designation", "label": "Autres — désignation",
                         "type": "text"},
                        {"key": "autres_montant", "label": "Autres (CHF)",
                         "type": "currency", "symbol": "CHF", "decimals": 2},
                    ],
                },
                {
                    "id": "infos", "name": "Informations",
                    "title": "Informations", "type": "info",
                    "items": [
                        {"label": "Nom", "type": "text", "value": "{{author_name}}"},
                        {"label": "Mois", "type": "text", "value": ""},
                        {"label": "Année", "type": "text", "value": ""},
                        {"label": "Date d'édition", "type": "date", "value": "{{today}}"},
                    ],
                },
            ]
        }
    },
}


PRESENTATION = {
    "slug": "presentation-standard-vnv",
    "name": "Présentation standard",
    "names": {"fr": "Présentation standard", "en": "Standard presentation",
              "de": "Standardpräsentation", "it": "Presentazione standard"},
    "language": "fr", "languages": ["fr", "en", "de", "it"],
    "doc_type": "pptx", "builder_key": "pptx", "is_block_based": True,
    "description": "Modèle de présentation générique (corps Roboto) : page de "
                   "titre puis sections Introduction, Contenu et Conclusion.",
    "schema": [
        {"id": "pr_h_intro", "type": "heading", "level": 1, "text": "Introduction"},
        {"id": "pr_intro", "type": "bullet_list", "items": [
            "Contexte", "Objectifs", "Périmètre"]},
        {"id": "pr_h_content", "type": "heading", "level": 1, "text": "Contenu"},
        {"id": "pr_content", "type": "bullet_list", "items": [
            "Point clé 1", "Point clé 2", "Point clé 3"]},
        {"id": "pr_h_ccl", "type": "heading", "level": 1, "text": "Conclusion"},
        {"id": "pr_ccl", "type": "bullet_list", "items": [
            "Synthèse", "Prochaines étapes"]},
    ],
    "settings": {
        "pptx": {"main_color": "#EC6608", "include_logo": True},
        "cover_title": "{{document_title}}",
        "cover_subtitle": "{{client_name}} — {{project_name}}",
    },
}


STATUT_PROJET = {
    "slug": "statut-projet-vnv",
    "name": "Statut de projet",
    "names": {"fr": "Statut de projet", "en": "Project status",
              "de": "Projektstatus", "it": "Stato del progetto"},
    "language": "fr", "languages": ["fr", "en", "de", "it"],
    "doc_type": "pptx", "builder_key": "pptx", "is_block_based": True,
    "description": "Présentation de statut de projet : agenda, vue générale, "
                   "budget, objectifs, planning, périmètre, risques, jalons et notes.",
    "schema": [
        {"id": "st_h_agenda", "type": "heading", "level": 1, "text": "Agenda"},
        {"id": "st_agenda", "type": "bullet_list", "items": [
            "Vue générale du projet", "Budget", "Objectifs", "Planning",
            "Périmètre", "Risques", "Jalons / livrables", "Aperçu du planning",
            "Notes et prochain statut"]},
        {"id": "st_h_vue", "type": "heading", "level": 1, "text": "Vue générale du projet"},
        {"id": "st_vue", "type": "bullet_list", "items": [
            "Progression projet : {{version}}", "Jalon X : à faire", "Jalon Y : à faire"]},
        {"id": "st_h_budget", "type": "heading", "level": 1, "text": "Budget"},
        {"id": "st_budget", "type": "text", "text": "État des lieux du budget."},
        {"id": "st_h_obj", "type": "heading", "level": 1, "text": "Objectifs"},
        {"id": "st_obj", "type": "text", "text": "État des lieux des objectifs."},
        {"id": "st_h_plan", "type": "heading", "level": 1, "text": "Planning"},
        {"id": "st_plan", "type": "text", "text": "État des lieux du planning."},
        {"id": "st_h_peri", "type": "heading", "level": 1, "text": "Périmètre"},
        {"id": "st_peri", "type": "text", "text": "État des lieux du périmètre."},
        {"id": "st_h_risk", "type": "heading", "level": 1, "text": "Risques"},
        {"id": "st_risk", "type": "text", "text": "Principaux risques et mesures."},
        {"id": "st_h_jalons", "type": "heading", "level": 1, "text": "Jalons / livrables"},
        {"id": "st_jalons", "type": "table", "key": "jalons", "label": "",
         "columns": [{"label": "Jalon"}, {"label": "Échéance"},
                     {"label": "Statut"}, {"label": "Responsable"}]},
        {"id": "st_h_gantt", "type": "heading", "level": 1, "text": "Aperçu du planning"},
        {"id": "st_gantt", "type": "text", "text": "Copie d'écran du planning (Gantt)."},
        {"id": "st_h_notes", "type": "heading", "level": 1, "text": "Notes et prochain statut"},
        {"id": "st_notes", "type": "bullet_list", "items": [
            "Notes à communiquer au client", "Prochain statut : à planifier"]},
    ],
    "settings": {
        "pptx": {"main_color": "#EC6608", "include_logo": True},
        "cover_title": "Statut projet — {{project_name}}",
        "cover_subtitle": "{{today}}",
    },
}


LETTRE = {
    "slug": "lettre-vnv",
    "name": "Lettre",
    "names": {"fr": "Lettre", "en": "Letter", "de": "Brief", "it": "Lettera"},
    "language": "fr", "languages": ["fr", "en", "de", "it"],
    "doc_type": "docx", "builder_key": "custom", "is_block_based": True,
    "description": "Courrier standard : lieu et date, objet, corps et signature.",
    "schema": [
        {"id": "le_date", "type": "text", "text": "La Chaux-de-Fonds, le {{today}}"},
        {"id": "le_objet", "type": "field", "key": "objet", "label": "Concerne",
         "field_type": "text", "show_label": True},
        {"id": "le_corps", "type": "field", "key": "corps", "label": "Corps de la lettre",
         "field_type": "textarea", "show_label": False},
        {"id": "le_salut", "type": "text",
         "text": "Nous vous prions d'agréer nos salutations distinguées."},
        {"id": "le_sign", "type": "field", "key": "signature", "label": "Signature",
         "field_type": "text", "show_label": False},
    ],
    "settings": {"include_cover": False, "include_suivi": False,
                 "include_toc": False, "pdf_from_docx": True},
}


LETTRE_CONTRAT = {
    "slug": "lettre-envoi-contrat-vnv",
    "name": "Lettre — envoi de contrat",
    "names": {"fr": "Lettre — envoi de contrat", "en": "Letter — contract delivery",
              "de": "Brief — Vertragsversand", "it": "Lettera — invio contratto"},
    "language": "fr", "languages": ["fr", "en", "de", "it"],
    "doc_type": "docx", "builder_key": "custom", "is_block_based": True,
    "description": "Courrier d'accompagnement pour l'envoi d'un contrat : objet, "
                   "corps, liste des documents joints et signature.",
    "schema": [
        {"id": "lc_date", "type": "text", "text": "La Chaux-de-Fonds, le {{today}}"},
        {"id": "lc_objet", "type": "field", "key": "objet", "label": "Concerne",
         "field_type": "text", "show_label": True},
        {"id": "lc_intro", "type": "text", "text": "Madame, Monsieur,"},
        {"id": "lc_corps", "type": "text",
         "text": "Nous avons le plaisir de vous faire parvenir, ci-joint, le contrat "
                 "relatif au projet {{project_name}} pour signature."},
        {"id": "lc_h_docs", "type": "heading", "level": 3, "text": "Documents joints"},
        {"id": "lc_docs", "type": "bullet_list", "items": [
            "Contrat en deux exemplaires", "Conditions générales", "Annexe tarifaire"]},
        {"id": "lc_retour", "type": "text",
         "text": "Nous vous remercions de nous retourner un exemplaire daté et signé."},
        {"id": "lc_salut", "type": "text",
         "text": "Nous vous prions d'agréer nos salutations distinguées."},
        {"id": "lc_sign", "type": "field", "key": "signature", "label": "Signature",
         "field_type": "text", "show_label": False},
    ],
    "settings": {"include_cover": False, "include_suivi": False,
                 "include_toc": False, "pdf_from_docx": True},
}


ATTACHED_TEMPLATES_2 = [NOTE_DE_FRAIS, PRESENTATION, STATUT_PROJET, LETTRE, LETTRE_CONTRAT]


def add_templates(apps, schema_editor):
    Template = apps.get_model("documents", "DocumentTemplate")
    for tpl in ATTACHED_TEMPLATES_2:
        defaults = {k: v for k, v in tpl.items() if k != "slug"}
        defaults["is_system"] = True
        defaults["is_active"] = True
        Template.objects.update_or_create(slug=tpl["slug"], defaults=defaults)


def remove_templates(apps, schema_editor):
    Template = apps.get_model("documents", "DocumentTemplate")
    from django.db.models import ProtectedError
    for tpl in ATTACHED_TEMPLATES_2:
        try:
            Template.objects.filter(slug=tpl["slug"], documents__isnull=True).delete()
        except ProtectedError:
            pass


class Migration(migrations.Migration):

    dependencies = [
        ("documents", "0012_add_attached_templates"),
    ]

    operations = [
        migrations.RunPython(add_templates, remove_templates),
    ]
