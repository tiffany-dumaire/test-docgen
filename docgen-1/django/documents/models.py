from django.conf import settings
from django.db import models

from core.models import Project


class Confidentiality(models.TextChoices):
    PUBLIC = "public", "Public"
    INTERNAL = "internal", "Interne"
    CONFIDENTIAL = "confidential", "Confidentiel"
    SECRET = "secret", "Secret"


class DocumentTemplate(models.Model):
    """A reusable, generic definition that produces documents.

    ``kind`` selects the generator. ``config`` holds the type-specific
    definition (positioned fields for PDF, column/pivot spec for Excel,
    sections for Word).
    """

    KIND_PDF = "pdf"
    KIND_EXCEL = "excel"
    KIND_WORD = "word"
    KIND_CHOICES = [
        (KIND_PDF, "PDF positionné"),
        (KIND_EXCEL, "Excel générique"),
        (KIND_WORD, "Word d'analyse"),
    ]

    name = models.CharField("Nom du modèle", max_length=255)
    kind = models.CharField("Type", max_length=16, choices=KIND_CHOICES)
    description = models.TextField("Description", blank=True)
    is_generic = models.BooleanField(
        "Modèle générique", default=True,
        help_text="Réutilisable sur n'importe quel projet.")

    # PDF only: a background the fields are placed on top of.
    background_image = models.ImageField(
        "Fond (image, pour l'éditeur)", upload_to="templates/bg/",
        blank=True, null=True)
    background_pdf = models.FileField(
        "Fond (PDF, fusionné à la génération)", upload_to="templates/bg/",
        blank=True, null=True)

    # Type-specific definition. See generators/ for the expected shape.
    config = models.JSONField("Définition", default=dict, blank=True)

    default_confidentiality = models.CharField(
        "Confidentialité par défaut", max_length=16,
        choices=Confidentiality.choices, default=Confidentiality.INTERNAL)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Modèle de document"
        verbose_name_plural = "Modèles de documents"
        ordering = ["-updated_at"]

    def __str__(self):
        return f"{self.name} ({self.get_kind_display()})"


class Document(models.Model):
    """A concrete document produced from a template for a project."""

    template = models.ForeignKey(
        DocumentTemplate, on_delete=models.PROTECT, related_name="documents",
        verbose_name="Modèle")
    project = models.ForeignKey(
        Project, on_delete=models.CASCADE, related_name="documents",
        verbose_name="Projet", null=True, blank=True)

    title = models.CharField("Titre", max_length=255)
    confidentiality = models.CharField(
        "Confidentialité", max_length=16,
        choices=Confidentiality.choices, default=Confidentiality.INTERNAL)

    # Values fed to the generator (variables / rows / params).
    data = models.JSONField("Données & variables", default=dict, blank=True)

    current_file = models.FileField(
        "Fichier courant", upload_to="documents/", blank=True, null=True)
    current_version = models.PositiveIntegerField("Version courante", default=0)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Document"
        verbose_name_plural = "Documents"
        ordering = ["-updated_at"]

    def __str__(self):
        return self.title

    @property
    def kind(self):
        return self.template.kind


class DocumentVersion(models.Model):
    """History of every regeneration, with comment and author initials."""

    document = models.ForeignKey(
        Document, on_delete=models.CASCADE, related_name="versions")
    number = models.PositiveIntegerField("N° de version")
    file = models.FileField("Fichier", upload_to="documents/versions/")
    comment = models.TextField("Commentaire", blank=True)

    author = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True,
        blank=True, verbose_name="Auteur")
    author_initials = models.CharField("Initiales", max_length=8, blank=True)

    # Snapshot of the data used for this exact version (auditability).
    data_snapshot = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Version de document"
        verbose_name_plural = "Versions de documents"
        ordering = ["-number"]
        unique_together = ("document", "number")

    def __str__(self):
        return f"{self.document.title} v{self.number}"
