"""Initialise le logo du profil entreprise avec le logo officiel VNV.

Le logo (extrait de « Corporate Identity - VNV ») est livré comme ressource du
dépôt (``documents/assets/brand/vnv_logo.png``). On le copie dans le dossier
média et on le rattache au profil entreprise s'il n'en a pas déjà un.

Sans ce fichier, les blocs « logo » et les en-têtes « avec logo » des modèles
Word/PDF/Lettre ne produisaient rien : le logo était donc absent des documents.

Idempotent ; n'écrase jamais un logo déjà téléversé par l'utilisateur.
"""
import shutil
from pathlib import Path

from django.conf import settings
from django.db import migrations

LOGO_NAME = "vnv_logo.png"
REL_PATH = f"company/{LOGO_NAME}"


def _asset_path():
    return (Path(settings.BASE_DIR) / "documents" / "assets" / "brand" / LOGO_NAME)


def set_logo(apps, schema_editor):
    Company = apps.get_model("company", "CompanyProfile")
    src = _asset_path()
    if not src.exists():
        return
    company = Company.objects.filter(pk=1).first()
    if company is None:
        company = Company(pk=1, name="Mon entreprise")
    if getattr(company, "logo", None):
        return  # ne pas écraser un logo existant
    dest = Path(settings.MEDIA_ROOT) / REL_PATH
    dest.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(src, dest)
    company.logo = REL_PATH
    company.save()


def unset_logo(apps, schema_editor):
    Company = apps.get_model("company", "CompanyProfile")
    company = Company.objects.filter(pk=1).first()
    if company is not None and getattr(company, "logo", "") == REL_PATH:
        company.logo = ""
        company.save()


class Migration(migrations.Migration):

    dependencies = [
        ("company", "0005_usefullink_category_alter_usefullink_url"),
    ]

    operations = [
        migrations.RunPython(set_logo, unset_logo),
    ]
