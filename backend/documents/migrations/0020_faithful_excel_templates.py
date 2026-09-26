"""Rend les rendus Excel fidèles aux documents sources.

Les modèles « Modèle de cotation » et « Note de frais » avaient été convertis
génériquement vers le moteur « grille » (0019). Cette conversion ne restituait
pas fidèlement la mise en page d'origine (fusions, largeurs, hauteurs, styles
et formats par cellule). On remplace donc leur grille par une grille extraite
fidèlement des fichiers `.xltx` fournis, et on ajoute un nouveau modèle
« PV de séance » (également extrait de son `.xltx`).

Les grilles fidèles sont stockées comme fichiers JSON dans
``documents/assets/excel_templates/`` (les pièces jointes ne sont pas
disponibles à l'exécution). Migration de données idempotente ; réversible :
la configuration précédente est conservée dans ``settings["excel_pre_faithful"]``.
"""
import json
from pathlib import Path

from django.db import migrations

ASSETS = Path(__file__).resolve().parent.parent / "assets" / "excel_templates"


def _load(name):
    with open(ASSETS / f"{name}.json", encoding="utf-8") as fh:
        return json.load(fh)


# slug -> fichier JSON de grille fidèle
FAITHFUL = {
    "modele-cotation-vnv": "cotation",
    "note-de-frais-vnv": "note_de_frais",
}

PV_SEANCE = {
    "slug": "pv-seance-vnv",
    "name": "PV de séance",
    "names": {"fr": "PV de séance", "en": "Meeting minutes",
              "de": "Sitzungsprotokoll", "it": "Verbale di seduta"},
    "language": "fr", "languages": ["fr", "en", "de", "it"],
    "doc_type": "xlsx", "builder_key": "excel_workbook", "is_block_based": False,
    "description": "Procès-verbal de séance : participants, ordre du jour, "
                   "décisions et actions à suivre (mise en page fidèle au modèle VNV).",
    "schema": [],
    "asset": "pv_seance",
}


def apply_faithful(apps, schema_editor):
    Template = apps.get_model("documents", "DocumentTemplate")

    # 1) Remplace la grille des modèles existants par la grille fidèle.
    for slug, asset in FAITHFUL.items():
        try:
            tpl = Template.objects.get(slug=slug)
        except Template.DoesNotExist:
            continue
        settings = dict(tpl.settings or {})
        if "excel_pre_faithful" not in settings:
            settings["excel_pre_faithful"] = settings.get("excel")
        settings["excel"] = _load(asset)
        tpl.settings = settings
        tpl.save(update_fields=["settings"])

    # 2) Crée (ou met à jour) le modèle « PV de séance ».
    spec = dict(PV_SEANCE)
    asset = spec.pop("asset")
    slug = spec.pop("slug")
    spec["settings"] = {"excel": _load(asset)}
    spec["is_system"] = True
    spec["is_active"] = True
    Template.objects.update_or_create(slug=slug, defaults=spec)


def revert(apps, schema_editor):
    Template = apps.get_model("documents", "DocumentTemplate")

    for slug in FAITHFUL:
        try:
            tpl = Template.objects.get(slug=slug)
        except Template.DoesNotExist:
            continue
        settings = dict(tpl.settings or {})
        if "excel_pre_faithful" in settings:
            prev = settings.pop("excel_pre_faithful")
            if prev is not None:
                settings["excel"] = prev
            tpl.settings = settings
            tpl.save(update_fields=["settings"])

    from django.db.models import ProtectedError
    try:
        Template.objects.filter(slug=PV_SEANCE["slug"],
                                documents__isnull=True).delete()
    except ProtectedError:
        pass


class Migration(migrations.Migration):

    dependencies = [
        ("documents", "0019_excel_to_grid"),
    ]

    operations = [
        migrations.RunPython(apply_faithful, revert),
    ]
