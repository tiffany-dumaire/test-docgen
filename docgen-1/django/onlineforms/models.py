import secrets

from django.conf import settings
from django.db import models

from core.models import Project


def _make_code():
    return secrets.token_urlsafe(5)[:8]


class OnlineForm(models.Model):
    """A public online form reachable through a short link /f/<code>/.

    ``schema`` is a list of field definitions::

        [
          {"name": "email",   "label": "E-mail",  "type": "email", "required": true},
          {"name": "budget",  "label": "Budget",  "type": "number"},
          {"name": "message", "label": "Message", "type": "textarea"}
        ]
    """

    title = models.CharField("Titre", max_length=255)
    description = models.TextField("Description", blank=True)
    project = models.ForeignKey(
        Project, on_delete=models.CASCADE, related_name="online_forms",
        null=True, blank=True, verbose_name="Projet")

    code = models.CharField("Code court", max_length=12, unique=True,
                            default=_make_code, editable=False)
    schema = models.JSONField("Champs", default=list, blank=True)
    is_open = models.BooleanField("Ouvert aux réponses", default=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Formulaire en ligne"
        verbose_name_plural = "Formulaires en ligne"
        ordering = ["-created_at"]

    def __str__(self):
        return self.title

    @property
    def short_url(self):
        return f"{settings.PUBLIC_BASE_URL.rstrip('/')}/f/{self.code}/"


class FormSubmission(models.Model):
    form = models.ForeignKey(OnlineForm, on_delete=models.CASCADE,
                             related_name="submissions")
    answers = models.JSONField(default=dict)
    submitted_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Réponse de formulaire"
        verbose_name_plural = "Réponses de formulaires"
        ordering = ["-submitted_at"]

    def __str__(self):
        return f"Réponse #{self.pk} — {self.form.title}"
