from django.db import models


class Contact(models.Model):
    """Personne de contact, côté client ou côté interne."""

    CLIENT = "client"
    INTERNAL = "internal"
    TYPE_CHOICES = [
        (CLIENT, "Contact client"),
        (INTERNAL, "Contact interne"),
    ]

    first_name = models.CharField("Prénom", max_length=100)
    last_name = models.CharField("Nom", max_length=100)
    contact_type = models.CharField(
        "Type", max_length=20, choices=TYPE_CHOICES, default=CLIENT
    )
    role = models.CharField("Fonction", max_length=150, blank=True)
    email = models.EmailField("E-mail", blank=True)
    phone = models.CharField("Téléphone", max_length=50, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["last_name", "first_name"]
        verbose_name = "Contact"
        verbose_name_plural = "Contacts"

    def __str__(self):
        return f"{self.full_name} ({self.get_contact_type_display()})"

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}".strip()

    @property
    def initials(self):
        i = ""
        if self.first_name:
            i += self.first_name[0]
        if self.last_name:
            i += self.last_name[0]
        return i.upper()


class Project(models.Model):
    """Un projet client, contexte de génération des documents."""

    name = models.CharField("Nom du projet", max_length=255)
    client_name = models.CharField("Nom du client", max_length=255)
    logo = models.ImageField("Logo du projet/client", upload_to="projects/", blank=True, null=True)
    description = models.TextField("Description", blank=True)

    client_contact = models.ForeignKey(
        Contact,
        verbose_name="Contact client",
        related_name="projects_as_client_contact",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        limit_choices_to={"contact_type": Contact.CLIENT},
    )
    internal_contact = models.ForeignKey(
        Contact,
        verbose_name="Contact interne",
        related_name="projects_as_internal_contact",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        limit_choices_to={"contact_type": Contact.INTERNAL},
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Projet"
        verbose_name_plural = "Projets"

    def __str__(self):
        return f"{self.name} — {self.client_name}"

    @property
    def documents_count(self):
        return self.documents.count()
