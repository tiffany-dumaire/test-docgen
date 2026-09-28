"""Corrige le type des modèles de courrier : « Lettre » et
« Lettre — envoi de contrat » sont des modèles de type LETTRE (et non Word).

Idempotent : met à jour les lignes existantes créées en 0013 avec doc_type=docx.
"""
from django.db import migrations

LETTER_SLUGS = ["lettre-vnv", "lettre-envoi-contrat-vnv"]


def to_lettre(apps, schema_editor):
    Template = apps.get_model("documents", "DocumentTemplate")
    Template.objects.filter(slug__in=LETTER_SLUGS).update(doc_type="lettre")


def to_docx(apps, schema_editor):
    Template = apps.get_model("documents", "DocumentTemplate")
    Template.objects.filter(slug__in=LETTER_SLUGS).update(doc_type="docx")


class Migration(migrations.Migration):

    dependencies = [
        ("documents", "0013_add_attached_templates_2"),
    ]

    operations = [
        migrations.RunPython(to_lettre, to_docx),
    ]
