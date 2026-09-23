import re
from datetime import date

from core.models import Company

_VAR_RE = re.compile(r"\{\{\s*([\w.]+)\s*\}\}")


def build_context(document):
    """Flatten project / company / contacts / params into a variable dict.

    Keys use dotted names, e.g. ``project.name``, ``client.name``,
    ``company.email``. Anything in ``document.data['params']`` is merged on
    top so callers (UI or API) can override or add variables.
    """
    company = Company.get_solo()
    project = document.project

    ctx = {
        "today": date.today().isoformat(),
        "document.title": document.title,
        "document.confidentiality": document.get_confidentiality_display(),
        "company.name": company.name,
        "company.description": company.description,
        "company.website": company.website_url,
        "company.terms_url": company.terms_url,
        "company.address": company.address,
        "company.phone": company.phone,
        "company.email": company.email,
    }

    if project:
        ctx.update({
            "project.name": project.name,
            "project.description": project.description,
            "client.name": project.client_name,
        })
        if project.client_contact:
            c = project.client_contact
            ctx["client.contact"] = str(c)
            ctx["client.contact.email"] = c.email
            ctx["client.contact.phone"] = c.phone
        if project.internal_contact:
            c = project.internal_contact
            ctx["internal.contact"] = str(c)
            ctx["internal.contact.initials"] = c.initials
            ctx["internal.contact.email"] = c.email

    # Free-form params provided by the UI or the external API.
    params = (document.data or {}).get("params", {})
    if isinstance(params, dict):
        ctx.update({str(k): v for k, v in params.items()})

    return ctx


def resolve(text, ctx):
    """Replace {{ variable }} tokens in a string using the context dict."""
    if not isinstance(text, str):
        return text

    def repl(m):
        key = m.group(1)
        val = ctx.get(key)
        return "" if val is None else str(val)

    return _VAR_RE.sub(repl, text)
