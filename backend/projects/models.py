from django.db import models


class Client(models.Model):
    """Client de l'entreprise, rattachable à plusieurs projets."""

    name = models.CharField("Nom du client", max_length=255)
    logo = models.ImageField("Logo du client", upload_to="clients/",
                             blank=True, null=True)
    contact_name = models.CharField("Contact principal", max_length=200, blank=True)
    email = models.EmailField("Email", blank=True)
    phone = models.CharField("Téléphone", max_length=50, blank=True)
    address = models.TextField("Adresse", blank=True)
    notes = models.TextField("Notes", blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]
        verbose_name = "Client"
        verbose_name_plural = "Clients"

    def __str__(self):
        return self.name


class Project(models.Model):
    """Un projet regroupe le contexte client et sert de base aux documents."""

    name = models.CharField("Nom du projet", max_length=255)
    client_name = models.CharField("Nom du client", max_length=255)
    styles = models.JSONField("Styles du projet", default=dict, blank=True)
    client = models.ForeignKey(
        "Client", related_name="projects", on_delete=models.SET_NULL,
        null=True, blank=True, verbose_name="Fiche client (principal)",
    )
    clients = models.ManyToManyField(
        "Client", related_name="projects_multi", blank=True,
        verbose_name="Clients associés",
    )
    parent = models.ForeignKey(
        "self", related_name="children", on_delete=models.SET_NULL,
        null=True, blank=True, verbose_name="Projet parent",
    )
    custom_field_defs = models.JSONField(
        "Définitions de champs personnalisés", default=list, blank=True,
        help_text="[{key,label,type}] où type ∈ text/textarea/number/date/boolean/select",
    )
    custom_fields = models.JSONField(
        "Valeurs des champs personnalisés", default=dict, blank=True,
    )
    tracking = models.JSONField(
        "Données de suivi de projet", default=dict, blank=True,
        help_text="{tasks:[], milestones:[], risks:[], snapshots:[]} pour les "
                  "diagrammes de suivi (Gantt, avancement, risques…).",
    )
    instances = models.JSONField(
        "Instances / machines", default=list, blank=True,
        help_text="[{name, ip, domain, url}] — serveurs / instances du projet.",
    )
    client_logo = models.ImageField(
        "Logo du client", upload_to="projects/", blank=True, null=True
    )
    logo = models.ImageField(
        "Logo du projet (facultatif)", upload_to="projects/", blank=True, null=True
    )
    description = models.TextField("Description", blank=True)

    reference = models.CharField(
        "Référence interne", max_length=100, blank=True,
        help_text="Code / référence du projet (facultatif)",
    )

    STATUS_CHOICES = [
        ("active", "Actif"),
        ("on_hold", "En pause"),
        ("archived", "Archivé"),
    ]
    status = models.CharField(
        "Statut", max_length=20, choices=STATUS_CHOICES, default="active"
    )

    start_date = models.DateField("Date de début", null=True, blank=True)
    end_date = models.DateField("Date de fin prévue", null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]
        verbose_name = "Projet"
        verbose_name_plural = "Projets"

    def __str__(self):
        return f"{self.name} ({self.client_name})"


class Contact(models.Model):
    """Contact rattaché à un projet, côté client ou côté interne."""

    CLIENT = "client"
    INTERNAL = "internal"
    KIND_CHOICES = [
        (CLIENT, "Contact client"),
        (INTERNAL, "Contact interne"),
    ]

    project = models.ForeignKey(
        Project, related_name="contacts", on_delete=models.CASCADE
    )
    kind = models.CharField("Type", max_length=10, choices=KIND_CHOICES)

    first_name = models.CharField("Prénom", max_length=100)
    last_name = models.CharField("Nom", max_length=100)
    role = models.CharField("Fonction", max_length=150, blank=True)
    email = models.EmailField("Email", blank=True)
    phone = models.CharField("Téléphone", max_length=50, blank=True)

    class Meta:
        ordering = ["kind", "last_name"]
        verbose_name = "Contact"
        verbose_name_plural = "Contacts"

    def __str__(self):
        return f"{self.first_name} {self.last_name} ({self.get_kind_display()})"

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}".strip()

    @property
    def initials(self):
        fi = self.first_name[:1].upper() if self.first_name else ""
        li = self.last_name[:1].upper() if self.last_name else ""
        return f"{fi}{li}"


class ProjectAssignment(models.Model):
    """Affectation d'un membre d'équipe (dev) à un projet, avec son rôle."""

    project = models.ForeignKey(
        Project, related_name="assignments", on_delete=models.CASCADE
    )
    member = models.ForeignKey(
        "company.TeamMember", related_name="assignments", on_delete=models.CASCADE
    )
    role = models.CharField("Rôle sur le projet", max_length=150, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["id"]
        unique_together = [("project", "member")]
        verbose_name = "Affectation projet"
        verbose_name_plural = "Affectations projet"

    def __str__(self):
        return f"{self.member} → {self.project}"


class Meeting(models.Model):
    """Réunion d'un projet, avec documents liés."""

    project = models.ForeignKey(Project, related_name="meetings",
                                on_delete=models.CASCADE)
    title = models.CharField("Titre", max_length=255)
    date = models.DateTimeField("Date", null=True, blank=True)
    location = models.CharField("Lieu / lien", max_length=255, blank=True)
    notes = models.TextField("Notes", blank=True)
    documents = models.ManyToManyField("documents.Document", blank=True,
                                       related_name="meetings")
    cancelled = models.BooleanField("Annulée", default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-date", "-id"]
        verbose_name = "Réunion"
        verbose_name_plural = "Réunions"

    def __str__(self):
        return self.title


class JournalEntry(models.Model):
    """Entrée de journal de projet (commentaire libre, catégorie, confidentialité).

    Peut être rattachée à une réunion ou à une version de document.
    """

    CATEGORY_CHOICES = [
        ("note", "Note"), ("decision", "Décision"), ("risk", "Risque"),
        ("action", "Action"), ("incident", "Incident"), ("info", "Information"),
        ("event", "Événement"),
    ]
    CONFIDENTIALITY_CHOICES = [
        ("public", "Public"), ("internal", "Interne"),
        ("confidential", "Confidentiel"), ("restricted", "Strictement confidentiel"),
    ]

    # Entrée rattachable à un projet et/ou directement à un client (journal client).
    project = models.ForeignKey(Project, related_name="journal", null=True,
                                blank=True, on_delete=models.CASCADE)
    client = models.ForeignKey("Client", related_name="journal", null=True,
                               blank=True, on_delete=models.CASCADE)
    meeting = models.ForeignKey(Meeting, related_name="journal", null=True,
                                blank=True, on_delete=models.SET_NULL)
    document_version = models.ForeignKey(
        "documents.DocumentVersion", related_name="journal", null=True, blank=True,
        on_delete=models.SET_NULL)
    category = models.CharField("Catégorie", max_length=20,
                                choices=CATEGORY_CHOICES, default="note")
    confidentiality = models.CharField("Confidentialité", max_length=20,
                                       choices=CONFIDENTIALITY_CHOICES,
                                       default="internal")
    body = models.TextField("Contenu", blank=True)
    body_html = models.TextField("Contenu enrichi", blank=True)
    # Entrées automatiques : posées par l'application (génération, réunion…).
    is_automatic = models.BooleanField("Automatique", default=False)
    event = models.CharField("Événement", max_length=40, blank=True)
    author = models.CharField("Auteur", max_length=150, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Entrée de journal"
        verbose_name_plural = "Journal"

    def __str__(self):
        return f"{self.category} — {self.body[:40]}"


class ProjectLink(models.Model):
    """Lien utile d'un projet (SharePoint, Teamwork, Bitwarden, instances, stacks…)."""

    project = models.ForeignKey(Project, related_name="links",
                                on_delete=models.CASCADE)
    category = models.CharField("Catégorie", max_length=100, blank=True,
                                help_text="ex. SharePoint, Instances, Stacks…")
    name = models.CharField("Nom", max_length=255)
    url = models.URLField("Lien", max_length=1000, blank=True)
    comment = models.CharField("Commentaire", max_length=500, blank=True)
    order = models.PositiveIntegerField("Ordre", default=0)

    class Meta:
        ordering = ["category", "order", "id"]
        verbose_name = "Lien projet"
        verbose_name_plural = "Liens projet"

    def __str__(self):
        return f"{self.category}: {self.name}"
