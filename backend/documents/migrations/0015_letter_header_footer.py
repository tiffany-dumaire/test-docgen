"""Initialise l'en-tête et le pied de page des modèles de lettre à partir de la
charte VNV (Modèle Lettre VNV.docx) : logo en en-tête, ligne d'adresse en pied.

Idempotent : fusionne dans settings sans écraser les autres réglages.
"""
from django.db import migrations

LETTER_SLUGS = ["lettre-vnv", "lettre-envoi-contrat-vnv"]

HEADER = {"enabled": True, "show_logo": True, "align": "left", "text": ""}
FOOTER = {
    "enabled": True,
    "align": "center",
    "text": ("info@vnv.ch    vnv.ch    +41 32 931 31 01\n"
             "VNV SA – Allée des Défricheurs 4 – CH-2300 La Chaux-de-Fonds"),
}


def set_hf(apps, schema_editor):
    Template = apps.get_model("documents", "DocumentTemplate")
    for tpl in Template.objects.filter(slug__in=LETTER_SLUGS):
        settings = dict(tpl.settings or {})
        settings.setdefault("header", HEADER)
        settings.setdefault("footer", FOOTER)
        # Force les valeurs de la charte même si des clés vides existaient.
        settings["header"] = {**HEADER, **(settings.get("header") or {})} \
            if settings.get("header") else HEADER
        settings["footer"] = FOOTER
        tpl.settings = settings
        tpl.save(update_fields=["settings"])


def unset_hf(apps, schema_editor):
    Template = apps.get_model("documents", "DocumentTemplate")
    for tpl in Template.objects.filter(slug__in=LETTER_SLUGS):
        settings = dict(tpl.settings or {})
        settings.pop("header", None)
        settings.pop("footer", None)
        tpl.settings = settings
        tpl.save(update_fields=["settings"])


class Migration(migrations.Migration):

    dependencies = [
        ("documents", "0014_letters_doc_type"),
    ]

    operations = [
        migrations.RunPython(set_hf, unset_hf),
    ]
