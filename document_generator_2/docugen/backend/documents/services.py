"""Service de (re)génération de documents et de création des versions."""
import re
from django.core.files.base import ContentFile
from django.db import transaction

from .generators.base import GenerationContext
from .generators.block_gen import BLOCK_RENDERERS
from .generators.registry import file_meta, get_generator
from .models import Document, DocumentVersion


def _slugify(value):
    value = re.sub(r"[^\w\s-]", "", str(value)).strip().lower()
    return re.sub(r"[-\s]+", "-", value) or "document"


@transaction.atomic
def generate_version(document: Document, *, author_initials, author_name="",
                     comment="", confidentiality=None, data=None):
    """
    Génère une nouvelle version du document :
      1. incrémente le numéro de version,
      2. produit le fichier via le bon générateur,
      3. enregistre la DocumentVersion (fichier + instantané des données),
      4. met à jour le document (data / confidentialité / version courante).
    """
    document = Document.objects.select_for_update().get(pk=document.pk)

    if data is not None:
        document.data = data
    if confidentiality:
        document.confidentiality = confidentiality

    next_version = document.current_version + 1
    # Fiabilise : évite toute collision si current_version a dérivé
    from django.db.models import Max
    max_existing = (document.versions.aggregate(m=Max("version_number"))["m"] or 0)
    if next_version <= max_existing:
        next_version = max_existing + 1

    ctx = GenerationContext.build(
        document,
        version_number=next_version,
        data=document.data,
        author_initials=author_initials,
        author_name=author_name,
        comment=comment,
        confidentiality=document.confidentiality,
    )

    excel_cfg = (document.template.settings or {}).get("excel", {})
    if document.doc_type == "xlsx" and excel_cfg.get("sheets"):
        # Classeur Excel personnalisable (onglets multiples : table / pivot / info)
        from .generators import excel_workbook
        generator = excel_workbook.render
    elif document.template.is_block_based:
        generator = BLOCK_RENDERERS.get(document.doc_type)
        if generator is None:
            raise ValueError(f"Type de document non pris en charge : {document.doc_type}")
    else:
        generator = get_generator(document.template.builder_key, document.doc_type)
    content = generator(ctx)

    ext, _mime = file_meta(document.doc_type)
    filename = f"{_slugify(document.title)}-v{next_version}{ext}"

    version = DocumentVersion(
        document=document,
        version_number=next_version,
        comment=comment,
        author_initials=author_initials,
        author_name=author_name,
        confidentiality=document.confidentiality,
        data_snapshot=document.data,
    )
    version.file.save(filename, ContentFile(content), save=False)
    version.save()

    document.current_version = next_version
    document.save(update_fields=["current_version", "data", "confidentiality",
                                 "updated_at"])
    return version
