"""Ajoute le modèle README (Markdown) et le modèle Pré-projet (Project Charter,
Word), et bascule « Offre d'emploi » sur le nouveau type de modèle « Offre »
(pas de page de garde, de suivi ni de sommaire).

Migration de données idempotente.
"""
from django.db import migrations

# --- README (Markdown) : contenu du modèle fourni --------------------------
README_MD = """# Project name

> MUST

Some succinct description of the project containing its aim and what it does.

## External documentations

> SHOULD

List of external documentation resources.

- Link to SharePoint / Thanos
- Link to TeamWork
- Link to wiki
- Link to other Gitlab repos
- etc.

## System context

### Overview

> MUST

Bullet points list of the system "containers" and neighbors.

### Architectural choices

> SHOULD

List of important architectural choices which have a significant impact for the developer.

- Event driven communication
- Internal job queue / Asynchronous processing
- Synchronization modalities
- Scaling / Clustering
- etc.

## Requirements

### Code dependencies

> SHOULD

Explain how to find dependencies of the project.

### Non functional requirements

> SHOULD

List of NFR.

- i18n
- Responsiveness
- Accessibility
- etc.

## Install & Run

> MUST

Explain how to clone, configure and run the project, preferably with exhaustive commands we can copy-paste.

## Usage

> SHOULD

Explain how to access, log in and use the app.

## Deploy

> MUST

Explain how to deploy the app.

### Initial setup

> SHOULD

Explain how to initially deploy the app.

### Environments

> MUST

List of existing environments with IP address, domain names, level (staging, prod), etc.

## Tests

> SHOULD

Explain how to run automated tests.

## Troubleshooting

> SHOULD

Helpful resources to troubleshoot the application.

## Contacts

> SHOULD

List some people working on the project along with their roles.
"""


def _md_to_blocks(md):
    """Convertit un Markdown simple (titres, listes, paragraphes, citations)
    en blocs exploitables par le générateur (heading / text / bullet_list)."""
    blocks = []
    n = 0

    def nid():
        nonlocal n
        n += 1
        return f"rm{n}"

    bullets = []

    def flush_bullets():
        nonlocal bullets
        if bullets:
            blocks.append({"id": nid(), "type": "bullet_list", "items": bullets})
            bullets = []

    for raw in md.splitlines():
        line = raw.rstrip()
        if not line.strip():
            flush_bullets()
            continue
        if line.startswith("### "):
            flush_bullets()
            blocks.append({"id": nid(), "type": "heading", "level": 3, "text": line[4:].strip()})
        elif line.startswith("## "):
            flush_bullets()
            blocks.append({"id": nid(), "type": "heading", "level": 2, "text": line[3:].strip()})
        elif line.startswith("# "):
            flush_bullets()
            blocks.append({"id": nid(), "type": "heading", "level": 1, "text": line[2:].strip()})
        elif line.startswith("- "):
            bullets.append(line[2:].strip())
        elif line.startswith("> "):
            flush_bullets()
            blocks.append({"id": nid(), "type": "text", "text": line.strip()})
        else:
            flush_bullets()
            blocks.append({"id": nid(), "type": "text", "text": line.strip()})
    flush_bullets()
    return blocks


README = {
    "slug": "readme",
    "name": "README",
    "names": {"fr": "README", "en": "README", "de": "README", "it": "README"},
    "language": "fr", "languages": ["fr", "en", "de", "it"],
    "doc_type": "md", "builder_key": "custom", "is_block_based": True,
    "description": "Modèle de fichier README de projet (structure standard : "
                   "contexte, prérequis, installation, déploiement, tests…).",
    "schema": _md_to_blocks(README_MD),
    "settings": {},
}


# --- Pré-projet (Project Charter, Word) ------------------------------------
PRE_PROJET = {
    "slug": "pre-projet-charter",
    "name": "Pré-projet (Project Charter)",
    "names": {"fr": "Pré-projet (Project Charter)", "en": "Project Charter",
              "de": "Projektauftrag", "it": "Project Charter"},
    "language": "fr", "languages": ["fr", "en", "de", "it"],
    "doc_type": "docx", "builder_key": "custom", "is_block_based": True,
    "description": "Charte de projet (pré-projet) : révisions, description, "
                   "planning et jalons, contraintes/risques/budget, parties "
                   "prenantes, signatures et annexes.",
    "schema": [
        {"id": "pc_title", "type": "heading", "level": 1, "text": "Project Charter — {{project_name}}"},
        {"id": "pc_h_rev", "type": "heading", "level": 2, "text": "Révisions"},
        {"id": "pc_rev", "type": "table", "key": "revisions", "label": "",
         "columns": [{"label": "Version"}, {"label": "Date"}, {"label": "Par"},
                     {"label": "Commentaire"}]},
        {"id": "pc_h_desc", "type": "heading", "level": 1, "text": "Description du projet"},
        {"id": "pc_ctx", "type": "field", "key": "contexte", "label": "Contexte et justification",
         "field_type": "textarea", "show_label": True},
        {"id": "pc_besoins", "type": "field", "key": "besoins", "label": "Besoins métiers",
         "field_type": "textarea", "show_label": True},
        {"id": "pc_obj", "type": "field", "key": "objectifs", "label": "Objectifs du projet",
         "field_type": "textarea", "show_label": True},
        {"id": "pc_perimetre", "type": "field", "key": "perimetre", "label": "Périmètre (inclus / exclu)",
         "field_type": "textarea", "show_label": True},
        {"id": "pc_livrables", "type": "field", "key": "livrables", "label": "Livrables",
         "field_type": "textarea", "show_label": True},
        {"id": "pc_h_plan", "type": "heading", "level": 1, "text": "Planning et jalons"},
        {"id": "pc_plan_note", "type": "text",
         "text": "Cette section pose les principaux jalons du projet et les "
                 "planifie dans le temps. Elle ne constitue pas un engagement "
                 "contractuel ferme."},
        {"id": "pc_plan", "type": "table", "key": "jalons", "label": "",
         "columns": [{"label": "Jalon"}, {"label": "Début"}, {"label": "Fin"}]},
        {"id": "pc_h_risk", "type": "heading", "level": 1, "text": "Contraintes, risques et budget"},
        {"id": "pc_hyp", "type": "field", "key": "hypotheses", "label": "Hypothèses et contraintes",
         "field_type": "textarea", "show_label": True},
        {"id": "pc_risks", "type": "table", "key": "risques", "label": "Risques",
         "columns": [{"label": "Risque"}, {"label": "Mitigation du risque"}]},
        {"id": "pc_budget", "type": "table", "key": "budget", "label": "Budget et ressources",
         "columns": [{"label": "Poste"}, {"label": "Montant"}]},
        {"id": "pc_h_stake", "type": "heading", "level": 1, "text": "Parties prenantes"},
        {"id": "pc_stake", "type": "table", "key": "parties_prenantes", "label": "",
         "columns": [{"label": "Rôle"}, {"label": "Nom et prénom"}, {"label": "Contact"}]},
        {"id": "pc_h_sign", "type": "heading", "level": 1, "text": "Signatures"},
        {"id": "pc_sign", "type": "text", "text": "Effectué en deux exemplaires, le {{today}}."},
        {"id": "pc_h_annex", "type": "heading", "level": 1, "text": "Annexes"},
        {"id": "pc_annex", "type": "field", "key": "annexes", "label": "Annexes",
         "field_type": "textarea", "show_label": False},
    ],
    "settings": {"include_cover": True, "include_suivi": False,
                 "include_toc": True, "pdf_from_docx": True,
                 "cover_title": "Project Charter", "cover_subtitle": "{{project_name}}"},
}


def apply_changes(apps, schema_editor):
    Template = apps.get_model("documents", "DocumentTemplate")
    for tpl in (README, PRE_PROJET):
        defaults = {k: v for k, v in tpl.items() if k != "slug"}
        defaults["is_system"] = True
        defaults["is_active"] = True
        Template.objects.update_or_create(slug=tpl["slug"], defaults=defaults)

    # « Offre d'emploi » -> type « Offre » (sans garde / suivi / sommaire).
    for tpl in Template.objects.filter(slug="offre-emploi-vnv"):
        tpl.doc_type = "offre"
        s = dict(tpl.settings or {})
        s.update({"include_cover": False, "include_suivi": False,
                  "include_toc": False, "pdf_from_docx": True})
        tpl.settings = s
        tpl.save(update_fields=["doc_type", "settings"])


def revert_changes(apps, schema_editor):
    Template = apps.get_model("documents", "DocumentTemplate")
    from django.db.models import ProtectedError
    for slug in ("readme", "pre-projet-charter"):
        for obj in Template.objects.filter(slug=slug, documents__isnull=True):
            try:
                obj.delete()
            except ProtectedError:
                pass
    Template.objects.filter(slug="offre-emploi-vnv").update(doc_type="docx")


class Migration(migrations.Migration):

    dependencies = [
        ("documents", "0017_alter_documenttemplate_doc_type"),
    ]

    operations = [
        migrations.RunPython(apply_changes, revert_changes),
    ]
