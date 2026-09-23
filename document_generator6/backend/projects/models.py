from django.db import models


class Client(models.Model):
    """Client de l'entreprise, rattachable à plusieurs projets."""

    name = models.CharField("Nom du client", max_length=255)
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
        null=True, blank=True, verbose_name="Fiche client",
    )
    client_logo = models.ImageField(
        "Logo du client", upload_to="projects/", blank=True, null=True
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
