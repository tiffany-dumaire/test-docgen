"""Ajoute les 8 outils d'analyse au format Template A3, multilingues (fr/en/de/it),
directement par migration (comme les autres modèles) — plus besoin de lancer la
commande seed_a3_tools à la main.

Réutilise les constructeurs (purs, sans modèle) de la commande seed_a3_tools.
Migration de données idempotente.
"""
from django.db import migrations
from django.db.models import ProtectedError

from documents.management.commands.seed_a3_tools import (
    ALL_LANGS, NAMES, TOOLS, _DESC, _ORIENT, _page,
)


def build_a3(apps, schema_editor):
    Template = apps.get_model("documents", "DocumentTemplate")
    langs = ALL_LANGS
    primary = "fr"
    for slug, name, landscape, fn in TOOLS:
        names = {l: NAMES.get(slug, {}).get(l, name) for l in langs}
        pages_i18n = {l: [_page(names[l], landscape, fn, l)] for l in langs}
        o = _ORIENT[primary][0 if landscape else 1]
        defaults = {
            "name": names[primary],
            "names": names,
            "language": primary,
            "languages": langs,
            "doc_type": "a3", "builder_key": "a3",
            "is_block_based": False, "schema": [],
            "is_system": True, "is_active": True,
            "description": _DESC[primary].format(name=names[primary], o=o),
            "settings": {"a3_export": "pdf",
                         "a3_pages": pages_i18n[primary],
                         "a3_pages_i18n": pages_i18n},
        }
        Template.objects.update_or_create(slug=slug, defaults=defaults)

    # Nettoyage d'éventuels anciens modèles mono-langue (slug-en/-de/-it).
    stale = [f"{slug}-{l}" for slug, *_ in TOOLS for l in ("en", "de", "it")]
    for obj in Template.objects.filter(slug__in=stale):
        try:
            obj.delete()
        except ProtectedError:
            pass


def remove_a3(apps, schema_editor):
    Template = apps.get_model("documents", "DocumentTemplate")
    slugs = [slug for slug, *_ in TOOLS]
    for obj in Template.objects.filter(slug__in=slugs, documents__isnull=True):
        try:
            obj.delete()
        except ProtectedError:
            pass


class Migration(migrations.Migration):

    dependencies = [
        ("documents", "0015_letter_header_footer"),
    ]

    operations = [
        migrations.RunPython(build_a3, remove_a3),
    ]
