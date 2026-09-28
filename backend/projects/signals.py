"""Récepteurs de signaux qui alimentent le journal automatiquement.

Couvre les événements « projet » et « client » : création de projet, réunions
(ajout / annulation), formulaires (ajout / réponse). Les contacts, l'équipe de
développement, les documents et les versions sont journalisés au plus près de
l'action (vues / services) pour disposer du contexte (auteur, libellés).
"""
from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver

from . import journal


@receiver(post_save, sender="projects.Project")
def _project_created(sender, instance, created, **kwargs):
    if created:
        journal.log_client(
            getattr(instance, "client", None) or None, "project_added",
            f"Projet « {instance.name} » créé.", project=instance)


@receiver(post_save, sender="projects.Meeting")
def _meeting_created(sender, instance, created, **kwargs):
    if created:
        journal.log_project(
            instance.project, "meeting_added",
            f"Réunion « {instance.title} » planifiée.", meeting=instance)


@receiver(post_delete, sender="projects.Meeting")
def _meeting_deleted(sender, instance, **kwargs):
    # La suppression d'une réunion vaut annulation.
    project = None
    try:
        project = instance.project
    except Exception:
        project = None
    if project is not None:
        journal.log_project(
            project, "meeting_cancelled",
            f"Réunion « {instance.title} » annulée.")


@receiver(post_save, sender="onlineforms.OnlineForm")
def _form_added(sender, instance, created, **kwargs):
    if created and getattr(instance, "project_id", None):
        journal.log_project(
            instance.project, "form_added",
            f"Formulaire « {instance.title} » ajouté au projet.")


@receiver(post_save, sender="onlineforms.FormSubmission")
def _form_response(sender, instance, created, **kwargs):
    if not created:
        return
    form = getattr(instance, "form", None)
    project = getattr(form, "project", None) if form else None
    if project is not None:
        journal.log_project(
            project, "form_response",
            f"Nouvelle réponse au formulaire « {form.title} ».",
            confidentiality="internal")
