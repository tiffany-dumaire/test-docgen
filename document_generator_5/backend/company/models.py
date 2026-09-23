from django.core.exceptions import ValidationError
from django.db import models


class CompanyProfile(models.Model):
    """
    Informations de l'entreprise qui génère les documents.

    Il s'agit d'un singleton : une seule instance existe (pk=1).
    Ces données sont réutilisées dans l'en-tête / pied de page de
    tous les documents générés.
    """

    name = models.CharField("Nom", max_length=255)
    logo = models.ImageField("Logo", upload_to="company/", blank=True, null=True)
    description = models.TextField("Description", blank=True)

    website_url = models.URLField("Site web", blank=True)
    terms_url = models.URLField("Conditions générales", blank=True)

    # Coordonnées
    address = models.TextField("Adresse", blank=True)
    phone = models.CharField("Téléphone", max_length=50, blank=True)
    email = models.EmailField("Email", blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Profil entreprise"
        verbose_name_plural = "Profil entreprise"

    styles = models.JSONField("Styles globaux", default=dict, blank=True)

    def __str__(self):
        return self.name or "Profil entreprise"

    def save(self, *args, **kwargs):
        # Force le singleton
        self.pk = 1
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        # On ne supprime jamais le singleton
        pass

    @classmethod
    def load(cls):
        obj, _ = cls.objects.get_or_create(pk=1, defaults={"name": "Mon entreprise"})
        return obj


class UsefulLink(models.Model):
    """Liens utiles additionnels rattachés au profil entreprise."""

    company = models.ForeignKey(
        CompanyProfile, related_name="useful_links", on_delete=models.CASCADE
    )
    label = models.CharField("Libellé", max_length=255)
    url = models.URLField("URL")
    order = models.PositiveIntegerField("Ordre", default=0)

    class Meta:
        ordering = ["order", "id"]
        verbose_name = "Lien utile"
        verbose_name_plural = "Liens utiles"

    def __str__(self):
        return f"{self.label} → {self.url}"


# (styles ajoutés à CompanyProfile ci-dessus)


class Team(models.Model):
    """Équipe interne de l'entreprise (ex. Développement, Design, Commerce)."""

    company = models.ForeignKey(
        CompanyProfile, related_name="teams", on_delete=models.CASCADE
    )
    name = models.CharField("Nom de l'équipe", max_length=150)
    description = models.TextField("Description", blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]
        verbose_name = "Équipe"
        verbose_name_plural = "Équipes"

    def __str__(self):
        return self.name


class TeamMember(models.Model):
    """Membre d'une équipe de l'entreprise."""

    team = models.ForeignKey(
        Team, related_name="members", on_delete=models.CASCADE
    )
    first_name = models.CharField("Prénom", max_length=100)
    last_name = models.CharField("Nom", max_length=100)
    role = models.CharField("Fonction", max_length=150, blank=True)
    email = models.EmailField("Email", blank=True)
    phone = models.CharField("Téléphone", max_length=50, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["last_name", "first_name"]
        verbose_name = "Membre d'équipe"
        verbose_name_plural = "Membres d'équipe"

    def __str__(self):
        return self.full_name

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}".strip()
