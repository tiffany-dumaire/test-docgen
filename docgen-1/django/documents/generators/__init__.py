from documents.models import DocumentTemplate

from .excel import generate_excel
from .pdf import generate_pdf
from .word import generate_word


def generate(document, context):
    """Dispatch to the right generator. Returns (filename, bytes)."""
    kind = document.template.kind
    if kind == DocumentTemplate.KIND_PDF:
        return generate_pdf(document, context)
    if kind == DocumentTemplate.KIND_EXCEL:
        return generate_excel(document, context)
    if kind == DocumentTemplate.KIND_WORD:
        return generate_word(document, context)
    raise ValueError(f"Type de modèle inconnu: {kind}")
