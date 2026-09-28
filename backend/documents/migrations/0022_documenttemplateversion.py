"""Ajoute le versionnement nommé des modèles de documents.

Chaque modèle peut avoir plusieurs versions nommées ; la version marquée par
défaut sert à générer les documents. Une version reprend l'instantané du
schéma (blocs) et des réglages (mise en page / styles) du modèle.
"""
import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("documents", "0021_excel_empty_currency_cells"),
    ]

    operations = [
        migrations.CreateModel(
            name="DocumentTemplateVersion",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True,
                                           serialize=False, verbose_name="ID")),
                ("name", models.CharField(blank=True, max_length=255,
                                          verbose_name="Nom de la version")),
                ("version_number", models.PositiveIntegerField(
                    default=1, verbose_name="Numéro de version")),
                ("is_default", models.BooleanField(
                    default=False, verbose_name="Version par défaut")),
                ("schema", models.JSONField(blank=True, default=list,
                                            verbose_name="Schéma / Blocs")),
                ("settings", models.JSONField(blank=True, default=dict,
                                              verbose_name="Réglages")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("template", models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name="versions", to="documents.documenttemplate")),
            ],
            options={
                "verbose_name": "Version de modèle",
                "verbose_name_plural": "Versions de modèles",
                "ordering": ["-version_number"],
                "unique_together": {("template", "version_number")},
            },
        ),
    ]
