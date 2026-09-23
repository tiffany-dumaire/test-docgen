from django.db import models


class Company(models.Model):
    """The company that produces the documents. Single-row settings object."""

    name = models.CharField("Nom", max_length=255)
    logo = models.ImageField("Logo", upload_to="company/", blank=True, null=True)
    description = models.TextField("Description", blank=True)

    website_url = models.URLField("Site web", blank=True)
    terms_url = models.URLField("Conditions générales", blank=True)
    other_links = models.JSONField(
        "Autres liens utiles",
        default=list,
        blank=True,
        help_text='Liste d\'objets {"label": "...", "url": "..."}',
    )

    address = models.TextField("Adresse", blank=True)
    phone = models.CharField("Téléphone", max_length=64, blank=True)
    email = models.EmailField("E-mail", blank=True)

    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Société émettrice"
        verbose_name_plural = "Société émettrice"

    def __str__(self):
        return self.name or "Société"

    @classmethod
    def get_solo(cls):
        obj = cls.objects.first()
        if obj is None:
            obj = cls.objects.create(name="Ma société")
        return obj


class Contact(models.Model):
    KIND_CLIENT = "client"
    KIND_INTERNAL = "internal"
    KIND_CHOICES = [
        (KIND_CLIENT, "Contact client"),
        (KIND_INTERNAL, "Contact interne"),
    ]

    kind = models.CharField("Type", max_length=16, choices=KIND_CHOICES)
    first_name = models.CharField("Prénom", max_length=128)
    last_name = models.CharField("Nom", max_length=128)
    role = models.CharField("Fonction", max_length=128, blank=True)
    email = models.EmailField("E-mail", blank=True)
    phone = models.CharField("Téléphone", max_length=64, blank=True)

    class Meta:
        verbose_name = "Contact"
        verbose_name_plural = "Contacts"
        ordering = ["last_name", "first_name"]

    def __str__(self):
        return f"{self.first_name} {self.last_name}"

    @property
    def initials(self):
        a = (self.first_name or " ")[0]
        b = (self.last_name or " ")[0]
        return (a + b).upper()


class Project(models.Model):
    name = models.CharField("Nom du projet", max_length=255)
    client_name = models.CharField("Nom du client", max_length=255)
    logo = models.ImageField("Logo client", upload_to="projects/", blank=True, null=True)
    description = models.TextField("Description", blank=True)

    client_contact = models.ForeignKey(
        Contact, verbose_name="Contact client", on_delete=models.SET_NULL,
        null=True, blank=True, related_name="projects_as_client",
        limit_choices_to={"kind": Contact.KIND_CLIENT},
    )
    internal_contact = models.ForeignKey(
        Contact, verbose_name="Contact interne", on_delete=models.SET_NULL,
        null=True, blank=True, related_name="projects_as_internal",
        limit_choices_to={"kind": Contact.KIND_INTERNAL},
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Projet"
        verbose_name_plural = "Projets"
        ordering = ["-updated_at"]

    def __str__(self):
        return f"{self.name} — {self.client_name}"
