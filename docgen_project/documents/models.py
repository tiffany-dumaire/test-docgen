from django.db import models
from projects.models import Project


# --- Choix partagés -------------------------------------------------------

class DocType(models.TextChoices):
    PDF_TRACKING = "pdf_tracking", "PDF de suivi de projet"
    EXCEL = "excel", "Fichier Excel générique"
    WORD_ANALYSIS = "word_analysis", "Fichier Word d'analyse"


class Confidentiality(models.TextChoices):
    PUBLIC = "public", "Public"
    INTERNAL = "internal", "Interne"
    CONFIDENTIAL = "confidential", "Confidentiel"
    SECRET = "secret", "Secret"


# --- Modèles réutilisables (templates) ------------------------------------

class DocumentTemplate(models.Model):
    """Un modèle réutilisable décrivant un type de document et ses variables.

    `variables_schema` est une liste de définitions de variables, par ex :
    [
      {"key": "budget", "label": "Budget", "type": "number"},
      {"key": "phases", "label": "Phases", "type": "list"}
    ]
    Types supportés : text, textarea, number, date, list, table, boolean.
    """

    name = models.CharField("Nom du modèle", max_length=255)
    doc_type = models.CharField(
        "Type de document", max_length=30, choices=DocType.choices
    )
    description = models.TextField("Description", blank=True)
    variables_schema = models.JSONField("Schéma des variables", default=list, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]
        verbose_name = "Modèle de document"
        verbose_name_plural = "Modèles de documents"

    def __str__(self):
        return f"{self.name} ({self.get_doc_type_display()})"


# --- Documents ------------------------------------------------------------

class Document(models.Model):
    """Un document rattaché à un projet, généré à partir de données/variables."""

    project = models.ForeignKey(
        Project, related_name="documents", on_delete=models.CASCADE
    )
    template = models.ForeignKey(
        DocumentTemplate,
        related_name="documents",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )

    title = models.CharField("Titre", max_length=255)
    doc_type = models.CharField(
        "Type de document", max_length=30, choices=DocType.choices
    )
    confidentiality = models.CharField(
        "Niveau de confidentialité",
        max_length=20,
        choices=Confidentiality.choices,
        default=Confidentiality.INTERNAL,
    )

    # Données/variables servant à la génération (dictionnaire clé -> valeur).
    data = models.JSONField("Données / variables", default=dict, blank=True)

    # Dernier fichier généré + numéro de version courant.
    current_file = models.FileField(
        "Fichier courant", upload_to="documents/", blank=True, null=True
    )
    current_version = models.PositiveIntegerField("Version courante", default=0)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]
        verbose_name = "Document"
        verbose_name_plural = "Documents"

    def __str__(self):
        return f"{self.title} (v{self.current_version})"

    @property
    def extension(self):
        return {
            DocType.PDF_TRACKING: "pdf",
            DocType.EXCEL: "xlsx",
            DocType.WORD_ANALYSIS: "docx",
        }.get(self.doc_type, "bin")


class DocumentVersion(models.Model):
    """Entrée d'historique : chaque régénération crée une version horodatée."""

    document = models.ForeignKey(
        Document, related_name="versions", on_delete=models.CASCADE
    )
    version_number = models.PositiveIntegerField("Numéro de version")
    comment = models.TextField("Commentaire de modification", blank=True)
    author_initials = models.CharField("Initiales de l'auteur", max_length=10)

    # Instantané des données et du fichier à cette version.
    data_snapshot = models.JSONField("Données à cette version", default=dict, blank=True)
    file = models.FileField("Fichier de la version", upload_to="versions/", blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-version_number"]
        unique_together = ("document", "version_number")
        verbose_name = "Version de document"
        verbose_name_plural = "Versions de documents"

    def __str__(self):
        return f"{self.document.title} — v{self.version_number} ({self.author_initials})"
