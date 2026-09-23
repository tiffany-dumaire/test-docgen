"""Services métier : génération d'un document + enregistrement de la version."""
from django.core.files.base import ContentFile

from .generators import generate_document
from .models import DocumentVersion


def regenerate_document(document, author_initials, comment=""):
    """Génère le fichier du document, incrémente la version et historise.

    Retourne la DocumentVersion créée.
    """
    content, filename = generate_document(document)

    new_version = document.current_version + 1

    # Enregistrer le fichier courant sur le document
    document.current_file.save(filename, ContentFile(content), save=False)
    document.current_version = new_version
    document.save()

    # Créer l'entrée d'historique (avec un instantané du fichier et des données)
    version = DocumentVersion.objects.create(
        document=document,
        version_number=new_version,
        comment=comment or "Génération du document",
        author_initials=(author_initials or "?").upper()[:10],
        data_snapshot=document.data,
    )
    version.file.save(filename, ContentFile(content), save=True)
    return version
