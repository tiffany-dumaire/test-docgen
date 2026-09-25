from django.db import models

from projects.models import Project


class ConfidentialityLevel(models.TextChoices):
    PUBLIC = "public", "Public"
    INTERNAL = "internal", "Interne"
    CONFIDENTIAL = "confidential", "Confidentiel"
    RESTRICTED = "restricted", "Strictement confidentiel"


class DocumentType(models.TextChoices):
    PDF = "pdf", "PDF"
    XLSX = "xlsx", "Excel"
    DOCX = "docx", "Word"
    PPTX = "pptx", "PowerPoint"
    MD = "md", "Markdown"
    A3 = "a3", "Template A3 (PNG / PDF)"
    BROCHURE = "brochure", "Brochure"
    LETTRE = "lettre", "Lettre"
    MAIL = "mail", "Mail"


class DocumentTemplate(models.Model):
    """
    Modèle de document. Définit :
      - le type de fichier produit (pdf / xlsx / docx),
      - le générateur à utiliser (builder_key),
      - le schéma des variables attendues (schema, JSON),
        chaque variable : {"key", "label", "type", "required", "help"}.
    """

    name = models.CharField("Nom du modèle", max_length=255)
    slug = models.SlugField("Identifiant", unique=True)
    description = models.TextField("Description", blank=True)
    doc_type = models.CharField(
        "Type de fichier", max_length=10, choices=DocumentType.choices
    )
    builder_key = models.CharField(
        "Générateur", max_length=100,
        help_text="Clé du générateur (ex: project_tracking, generic_table, "
        "analysis_report). 'custom' = rendu à partir des blocs.",
    )
    is_block_based = models.BooleanField(
        "Modèle par blocs", default=False,
        help_text="Si activé, le document est rendu à partir des blocs définis "
        "dans le schéma (éditeur visuel).",
    )
    schema = models.JSONField(
        "Schéma / Blocs", default=list, blank=True,
        help_text="Liste de blocs (modèle visuel) ou de variables (JSON).",
    )
    is_active = models.BooleanField("Actif", default=True)
    is_system = models.BooleanField(
        "Modèle système", default=False,
        help_text="Modèle générique fourni par défaut (non supprimable côté UI).",
    )
    settings = models.JSONField(
        "Réglages de mise en page", default=dict, blank=True,
        help_text="Page de garde, sommaire, page de suivi : "
        "{cover_title, cover_subtitle, include_cover, include_suivi, include_toc}.",
    )

    SCOPE_GLOBAL = "global"
    SCOPE_PROJECTS = "projects"
    SCOPE_CHOICES = [(SCOPE_GLOBAL, "Ouvert à tous"),
                     (SCOPE_PROJECTS, "Projets spécifiques")]
    scope = models.CharField("Portée", max_length=20, choices=SCOPE_CHOICES,
                             default=SCOPE_GLOBAL)
    projects = models.ManyToManyField("projects.Project", blank=True,
                                      related_name="templates_scoped")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]
        verbose_name = "Modèle de document"
        verbose_name_plural = "Modèles de documents"

    def __str__(self):
        return f"{self.name} [{self.get_doc_type_display()}]"


class Document(models.Model):
    """
    Instance de document rattachée à un projet et basée sur un modèle.
    Les valeurs des variables sont stockées dans `data`.
    L'historique complet est conservé dans les DocumentVersion.
    """

    project = models.ForeignKey(
        Project, related_name="documents", on_delete=models.CASCADE
    )
    template = models.ForeignKey(
        DocumentTemplate, related_name="documents", on_delete=models.PROTECT
    )
    title = models.CharField("Titre", max_length=255)
    confidentiality = models.CharField(
        "Confidentialité",
        max_length=20,
        choices=ConfidentialityLevel.choices,
        default=ConfidentialityLevel.INTERNAL,
    )
    data = models.JSONField("Valeurs des variables", default=dict, blank=True)

    current_version = models.PositiveIntegerField("Version courante", default=0)
    doc_date = models.DateField("Date du document", null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]
        verbose_name = "Document"
        verbose_name_plural = "Documents"

    def __str__(self):
        return f"{self.title} (v{self.current_version})"

    @property
    def doc_type(self):
        return self.template.doc_type

    @property
    def latest_version(self):
        return self.versions.order_by("-version_number").first()


class DocumentVersion(models.Model):
    """
    Version figée d'un document, produite lors d'une (re)génération.
    Conserve le fichier généré, un instantané des données, le commentaire
    et les initiales de l'auteur de la modification.
    """

    document = models.ForeignKey(
        Document, related_name="versions", on_delete=models.CASCADE
    )
    version_number = models.PositiveIntegerField("Numéro de version")
    comment = models.TextField("Commentaire de modification", blank=True)
    author_initials = models.CharField("Initiales de l'auteur", max_length=10)
    author_name = models.CharField("Nom de l'auteur", max_length=150, blank=True)

    confidentiality = models.CharField(
        "Confidentialité", max_length=20,
        choices=ConfidentialityLevel.choices,
        default=ConfidentialityLevel.INTERNAL,
    )
    data_snapshot = models.JSONField("Données figées", default=dict, blank=True)
    file = models.FileField("Fichier généré", upload_to="documents/%Y/%m/")

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-version_number"]
        unique_together = ("document", "version_number")
        verbose_name = "Version de document"
        verbose_name_plural = "Versions de document"

    def __str__(self):
        return f"{self.document.title} v{self.version_number}"


class DocumentAsset(models.Model):
    """Image téléversée pour être utilisée dans un modèle (glisser-déposer)."""

    image = models.ImageField("Image", upload_to="template_assets/")
    name = models.CharField("Nom", max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Image de modèle"
        verbose_name_plural = "Images de modèles"

    def __str__(self):
        return self.name or f"Image #{self.pk}"
