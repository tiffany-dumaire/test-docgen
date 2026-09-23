from django.core.files.base import ContentFile

from .generators import generate
from .models import DocumentVersion


def regenerate(document, comment="", user=None, initials=""):
    """Generate the file, store it as current, and append a version entry.

    Every regeneration creates an immutable ``DocumentVersion`` capturing the
    file, a comment, the author and their initials, plus a snapshot of the
    data used — this is the version history requested per document.
    """
    filename, content = generate(document, context=None)

    new_number = document.current_version + 1

    # Current (mutable) file on the document.
    document.current_file.save(filename, ContentFile(content), save=False)
    document.current_version = new_number
    document.save()

    if not initials and user is not None:
        initials = (getattr(user, "first_name", "") or user.username)[:1].upper()
        initials += (getattr(user, "last_name", "") or "")[:1].upper()

    version = DocumentVersion.objects.create(
        document=document,
        number=new_number,
        comment=comment,
        author=user if (user and user.is_authenticated) else None,
        author_initials=initials,
        data_snapshot=document.data,
    )
    version.file.save(f"v{new_number}_{filename}", ContentFile(content))
    return version
