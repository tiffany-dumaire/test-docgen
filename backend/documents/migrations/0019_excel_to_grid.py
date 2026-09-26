"""Migre les modèles Excel existants (onglets table / info) vers le moteur
« grille » (style, fusions et formats par cellule).

- Les onglets « pivot » (synthèses calculées) sont retirés (non statiques).
- Réversible : l'ancienne configuration reste dans settings["excel_legacy"].
"""
from django.db import migrations

from documents.generators.excel_convert import convert_sheets


def to_grid(apps, schema_editor):
    Template = apps.get_model("documents", "DocumentTemplate")
    for tpl in Template.objects.filter(doc_type="xlsx"):
        settings = dict(tpl.settings or {})
        excel = settings.get("excel") or {}
        sheets = excel.get("sheets") or []
        if not sheets or "excel_legacy" in settings:
            continue
        settings["excel_legacy"] = excel
        settings["excel"] = {"sheets": convert_sheets(sheets)}
        tpl.settings = settings
        tpl.save(update_fields=["settings"])


def revert(apps, schema_editor):
    Template = apps.get_model("documents", "DocumentTemplate")
    for tpl in Template.objects.filter(doc_type="xlsx"):
        settings = dict(tpl.settings or {})
        legacy = settings.pop("excel_legacy", None)
        if legacy is not None:
            settings["excel"] = legacy
            tpl.settings = settings
            tpl.save(update_fields=["settings"])


class Migration(migrations.Migration):

    dependencies = [
        ("documents", "0018_readme_preprojet_offre"),
    ]

    operations = [
        migrations.RunPython(to_grid, revert),
    ]
