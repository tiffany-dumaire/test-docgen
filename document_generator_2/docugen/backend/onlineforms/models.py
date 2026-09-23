import secrets
import string

from django.db import models

from documents.models import ConfidentialityLevel
from projects.models import Project

ALPHABET = string.ascii_letters + string.digits


def generate_code(length=7):
    return "".join(secrets.choice(ALPHABET) for _ in range(length))


class ShortLink(models.Model):
    """
    Lien réduit. Peut pointer vers un formulaire en ligne (public_form)
    ou vers une URL externe arbitraire.
    """

    code = models.CharField("Code", max_length=16, unique=True, db_index=True)
    target_url = models.URLField("URL cible", blank=True)
    click_count = models.PositiveIntegerField("Clics", default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Lien réduit"
        verbose_name_plural = "Liens réduits"

    def save(self, *args, **kwargs):
        if not self.code:
            code = generate_code()
            while ShortLink.objects.filter(code=code).exists():
                code = generate_code()
            self.code = code
        super().save(*args, **kwargs)

    def __str__(self):
        return f"/s/{self.code}"


class OnlineForm(models.Model):
    """
    Formulaire en ligne partageable via un lien réduit.
    `schema` : liste de champs {"key","label","type","required","options"}.
    Types de champs : text, textarea, email, number, date, select, checkbox.
    """

    title = models.CharField("Titre", max_length=255)
    description = models.TextField("Description", blank=True)
    project = models.ForeignKey(
        Project, related_name="forms", on_delete=models.SET_NULL,
        null=True, blank=True)
    schema = models.JSONField("Champs", default=list, blank=True)
    confidentiality = models.CharField(
        "Confidentialité", max_length=20,
        choices=ConfidentialityLevel.choices,
        default=ConfidentialityLevel.INTERNAL)
    is_open = models.BooleanField("Ouvert aux réponses", default=True)
    deadline = models.DateField("Date limite de réponse", null=True, blank=True)
    success_message = models.CharField(
        "Message de confirmation", max_length=255,
        default="Merci, votre réponse a bien été enregistrée.")

    short_link = models.OneToOneField(
        ShortLink, related_name="form", on_delete=models.SET_NULL,
        null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]
        verbose_name = "Formulaire en ligne"
        verbose_name_plural = "Formulaires en ligne"

    def __str__(self):
        return self.title

    def ensure_short_link(self):
        if not self.short_link:
            self.short_link = ShortLink.objects.create()
            self.save(update_fields=["short_link"])
        return self.short_link


class FormSubmission(models.Model):
    """Réponse à un formulaire en ligne."""

    form = models.ForeignKey(
        OnlineForm, related_name="submissions", on_delete=models.CASCADE)
    data = models.JSONField("Réponses", default=dict)
    submitted_at = models.DateTimeField(auto_now_add=True)
    respondent_ip = models.GenericIPAddressField(null=True, blank=True)

    class Meta:
        ordering = ["-submitted_at"]
        verbose_name = "Réponse"
        verbose_name_plural = "Réponses"

    def __str__(self):
        return f"Réponse à {self.form.title} ({self.submitted_at:%d/%m/%Y})"
