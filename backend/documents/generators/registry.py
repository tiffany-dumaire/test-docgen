"""
Registre des générateurs.

La sélection se fait d'abord par `builder_key` (permet des variantes),
puis, à défaut, par `doc_type` (pdf / xlsx / docx).
"""
from . import excel_gen, pdf_gen, word_gen

# Extensions et types MIME par type de document
FILE_META = {
    "pdf": (".pdf", "application/pdf"),
    "xlsx": (".xlsx",
             "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"),
    "docx": (".docx",
             "application/vnd.openxmlformats-officedocument.wordprocessingml.document"),
    "pptx": (".pptx",
             "application/vnd.openxmlformats-officedocument.presentationml.presentation"),
    "md": (".md", "text/markdown"),
    "a3": (".pdf", "application/pdf"),
    "a3_png": (".png", "image/png"),
    "a3_svg": (".svg", "image/svg+xml"),
    "brochure": (".docx",
                 "application/vnd.openxmlformats-officedocument.wordprocessingml.document"),
    "lettre": (".docx",
               "application/vnd.openxmlformats-officedocument.wordprocessingml.document"),
    "mail": (".md", "text/markdown"),
}

# builder_key -> (module, doc_type attendu)
BUILDERS = {
    "project_tracking": pdf_gen.generate,
    "generic_pdf": pdf_gen.generate,
    "generic_table": excel_gen.generate,
    "generic_excel": excel_gen.generate,
    "analysis_report": word_gen.generate,
    "generic_word": word_gen.generate,
}

# repli par type
DEFAULT_BY_TYPE = {
    "pdf": pdf_gen.generate,
    "xlsx": excel_gen.generate,
    "docx": word_gen.generate,
}


def get_generator(builder_key: str, doc_type: str):
    if builder_key in BUILDERS:
        return BUILDERS[builder_key]
    if doc_type in DEFAULT_BY_TYPE:
        return DEFAULT_BY_TYPE[doc_type]
    raise ValueError(f"Aucun générateur pour builder_key={builder_key!r} "
                     f"doc_type={doc_type!r}")


def file_meta(doc_type: str):
    return FILE_META.get(doc_type, (".bin", "application/octet-stream"))
