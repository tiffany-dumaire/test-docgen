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
