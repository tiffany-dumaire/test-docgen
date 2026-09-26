"""Rafraîchit les grilles Excel fidèles pour inclure les cellules vides qui ne
portent qu'un format (p. ex. montants « CHF »).

La migration 0020 avait ignoré les cellules sans valeur, sans fond et sans
bordure — y compris les cellules de saisie qui ne portaient qu'un format
monétaire. On recharge donc les grilles JSON (désormais complètes) pour les
trois modèles concernés, afin que ces cellules conservent leur format à la
saisie et apparaissent à l'aperçu.
"""
import json
from pathlib import Path

from django.db import migrations

ASSETS = Path(__file__).resolve().parent.parent / "assets" / "excel_templates"

# slug -> fichier JSON de grille fidèle
GRIDS = {
    "modele-cotation-vnv": "cotation",
    "note-de-frais-vnv": "note_de_frais",
    "pv-seance-vnv": "pv_seance",
}


def _load(name):
    with open(ASSETS / f"{name}.json", encoding="utf-8") as fh:
        return json.load(fh)


def refresh(apps, schema_editor):
    Template = apps.get_model("documents", "DocumentTemplate")
    for slug, asset in GRIDS.items():
        try:
            tpl = Template.objects.get(slug=slug)
        except Template.DoesNotExist:
            continue
        settings = dict(tpl.settings or {})
        settings["excel"] = _load(asset)
        tpl.settings = settings
        tpl.save(update_fields=["settings"])


def noop(apps, schema_editor):
    # Réversion : rien à faire (0020 conserve déjà l'historique via
    # settings["excel_pre_faithful"]).
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("documents", "0020_faithful_excel_templates"),
    ]

    operations = [
        migrations.RunPython(refresh, noop),
    ]
