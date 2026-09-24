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


class TeamMember(models.Model):
    """
    Collaborateur de l'entreprise. Rattaché à l'entreprise (et non plus à une
    seule équipe) : un collaborateur peut appartenir à zéro, une ou plusieurs
    équipes (relation many-to-many `Team.members`).
    """

    company = models.ForeignKey(
        CompanyProfile, related_name="collaborators", on_delete=models.CASCADE,
        null=True, blank=True,
    )
    first_name = models.CharField("Prénom", max_length=100)
    last_name = models.CharField("Nom", max_length=100)
    role = models.CharField("Fonction", max_length=150, blank=True)
    email = models.EmailField("Email", blank=True)
    phone = models.CharField("Téléphone", max_length=50, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["last_name", "first_name"]
        verbose_name = "Collaborateur"
        verbose_name_plural = "Collaborateurs"

    def __str__(self):
        return self.full_name

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}".strip()

    @property
    def initials(self):
        fi = self.first_name[:1].upper() if self.first_name else ""
        li = self.last_name[:1].upper() if self.last_name else ""
        return f"{fi}{li}"


class Team(models.Model):
    """
    Équipe interne de l'entreprise (ex. Développement, Design, Commerce).

    Une équipe peut :
      - regrouper des collaborateurs (M2M `members`) ;
      - avoir une équipe parente (`parent`) → sous-équipes ;
      - être liée hiérarchiquement à d'autres équipes (`related_teams`) ;
      - gérer un ou plusieurs projets (`projects`).
    L'organigramme est reconstruit automatiquement à partir de ces liens.
    """

    company = models.ForeignKey(
        CompanyProfile, related_name="teams", on_delete=models.CASCADE
    )
    name = models.CharField("Nom de l'équipe", max_length=150)
    description = models.TextField("Description", blank=True)
    color = models.CharField("Couleur", max_length=20, default="#38BDF8")
    parent = models.ForeignKey(
        "self", related_name="subteams", null=True, blank=True,
        on_delete=models.SET_NULL, verbose_name="Équipe parente",
    )
    related_teams = models.ManyToManyField(
        "self", symmetrical=False, related_name="related_from", blank=True,
        verbose_name="Équipes liées",
    )
    members = models.ManyToManyField(
        TeamMember, related_name="teams", blank=True,
        verbose_name="Collaborateurs",
    )
    projects = models.ManyToManyField(
        "projects.Project", related_name="teams", blank=True,
        verbose_name="Projets gérés",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]
        verbose_name = "Équipe"
        verbose_name_plural = "Équipes"

    def __str__(self):
        return self.name
