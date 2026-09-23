import secrets
import string

from django.db import models
from django.conf import settings
from projects.models import Project
from documents.models import Confidentiality


def generate_short_code(length=7):
    alphabet = string.ascii_letters + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(length))


class OnlineForm(models.Model):
    """Formulaire en ligne partageable via un lien réduit.

    `fields_schema` décrit les champs, par ex :
    [
      {"key": "email", "label": "Votre e-mail", "type": "email", "required": true},
      {"key": "satisfaction", "label": "Satisfaction", "type": "select",
       "options": ["Faible", "Moyenne", "Élevée"]}
    ]
    Types : text, textarea, email, number, date, select, checkbox.
    """

    project = models.ForeignKey(
        Project, related_name="forms", on_delete=models.CASCADE, null=True, blank=True
    )
    title = models.CharField("Titre", max_length=255)
    description = models.TextField("Description", blank=True)
    fields_schema = models.JSONField("Champs du formulaire", default=list, blank=True)
    confidentiality = models.CharField(
        "Niveau de confidentialité",
        max_length=20,
        choices=Confidentiality.choices,
        default=Confidentiality.INTERNAL,
    )
    is_active = models.BooleanField("Actif", default=True)
    short_code = models.CharField(
        "Code du lien réduit", max_length=16, unique=True, blank=True
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Formulaire en ligne"
        verbose_name_plural = "Formulaires en ligne"

    def __str__(self):
        return self.title

    def save(self, *args, **kwargs):
        if not self.short_code:
            code = generate_short_code()
            while OnlineForm.objects.filter(short_code=code).exists():
                code = generate_short_code()
            self.short_code = code
        super().save(*args, **kwargs)

    @property
    def short_url(self):
        base = getattr(settings, "SITE_BASE_URL", "").rstrip("/")
        return f"{base}/f/{self.short_code}/"

    @property
    def submissions_count(self):
        return self.submissions.count()


class FormSubmission(models.Model):
    """Une réponse soumise à un formulaire en ligne."""

    form = models.ForeignKey(
        OnlineForm, related_name="submissions", on_delete=models.CASCADE
    )
    data = models.JSONField("Réponses", default=dict)
    submitted_at = models.DateTimeField(auto_now_add=True)
    ip_address = models.GenericIPAddressField("Adresse IP", null=True, blank=True)

    class Meta:
        ordering = ["-submitted_at"]
        verbose_name = "Réponse de formulaire"
        verbose_name_plural = "Réponses de formulaires"

    def __str__(self):
        return f"Réponse à « {self.form.title} » du {self.submitted_at:%d/%m/%Y %H:%M}"
