"""Journalisation automatique des événements de projet et de client.

Point d'entrée unique : :func:`log`. Les récepteurs de signaux (signals.py) et
quelques vues appellent des raccourcis (``log_project`` / ``log_client``) pour
poser des entrées automatiques de journal.

Une entrée de projet dont le projet est rattaché à un client fixe aussi
``client`` : elle apparaît donc automatiquement dans le journal du client.
"""


def _resolve_client(project):
    if project is None:
        return None
    try:
        return project.client
    except Exception:
        return None


def log(*, project=None, client=None, event="", body="", body_html="",
        category="event", confidentiality="internal", author="Système",
        document_version=None, meeting=None):
    """Crée une entrée de journal automatique. Renvoie l'entrée (ou None)."""
    from .models import JournalEntry
    if client is None:
        client = _resolve_client(project)
    try:
        return JournalEntry.objects.create(
            project=project, client=client, event=event, body=body,
            body_html=body_html, category=category,
            confidentiality=confidentiality, author=author,
            is_automatic=True, document_version=document_version, meeting=meeting)
    except Exception:
        # La journalisation ne doit jamais casser l'action métier sous-jacente.
        return None


def log_project(project, event, body, **kw):
    return log(project=project, event=event, body=body, **kw)


def log_client(client, event, body, **kw):
    return log(client=client, event=event, body=body, **kw)
