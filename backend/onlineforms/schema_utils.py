"""Utilitaires de schéma de formulaire.

Le schéma d'un formulaire est une liste de **sections** :

    [{"kind": "section", "id", "title", "description",
      "elements": [ <question> | <contenu fixe> ]}]

- question : {"kind": "question", "key", "label", "hint", "type", "required",
              "options", "image", "template_file", ...}
- contenu  : {"kind": "content", "id", "content_type": "text|image|file",
              "title", "text", "url", "name"}

Compatibilité ascendante : un ancien schéma « plat » (liste de champs sans
``kind``) est interprété comme une unique section contenant ces questions.
"""

QUESTION_TYPES = {
    "text", "textarea", "email", "number", "date", "time", "select", "radio",
    "checkbox", "checkboxes", "scale", "rating", "slot", "file",
}
MULTI_VALUE_TYPES = {"checkboxes"}


def normalize_sections(schema):
    """Renvoie toujours une liste de sections, quel que soit le format d'entrée."""
    schema = schema or []
    if not isinstance(schema, list):
        return []
    # Nouveau format : au moins un élément « section ».
    if any(isinstance(it, dict) and it.get("kind") == "section" for it in schema):
        out = []
        for it in schema:
            if isinstance(it, dict) and it.get("kind") == "section":
                sec = dict(it)
                sec["elements"] = list(sec.get("elements") or [])
                out.append(sec)
        return out
    # Ancien format plat : une section implicite contenant les questions.
    elements = []
    for it in schema:
        if not isinstance(it, dict):
            continue
        el = dict(it)
        el.setdefault("kind", "question")
        elements.append(el)
    return [{"kind": "section", "id": "s1", "title": "", "description": "",
             "elements": elements}]


def iter_questions(schema):
    """Itère toutes les questions du schéma (sections ou format plat)."""
    for sec in normalize_sections(schema):
        for el in sec.get("elements") or []:
            if isinstance(el, dict) and el.get("kind", "question") == "question" \
                    and el.get("key"):
                yield el


def question_answered(question, value):
    """Une réponse est-elle fournie pour cette question ?"""
    qtype = question.get("type", "text")
    if qtype in MULTI_VALUE_TYPES:
        return bool(value) and isinstance(value, (list, tuple)) and len(value) > 0
    if qtype == "file":
        return bool(value)  # {"url","name"} ou identifiant
    if qtype == "checkbox":
        return value in (True, "true", "True", 1, "1", "oui")
    return str(value or "").strip() != ""
