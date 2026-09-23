from django.db import models


class AppUser(models.Model):
    """Utilisateur applicatif, alimenté depuis le jeton d'identité (OIDC).

    Non lié à l'authentification Django (accès par jeton). Porte le rôle
    applicatif (pour les permissions à venir) et les adhésions aux projets.
    """

    sub = models.CharField("Identifiant IdP (sub)", max_length=255, unique=True)
    email = models.EmailField("Email", blank=True)
    first_name = models.CharField("Prénom", max_length=150, blank=True)
    last_name = models.CharField("Nom", max_length=150, blank=True)
    app_roles = models.JSONField("Rôles applicatifs", default=list, blank=True)
    is_active = models.BooleanField("Actif", default=True)
    last_login = models.DateTimeField("Dernière connexion", null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["last_name", "first_name", "email"]
        verbose_name = "Utilisateur"
        verbose_name_plural = "Utilisateurs"

    def __str__(self):
        return self.full_name or self.email or self.sub

    # --- Compatibilité DRF (request.user) ---
    @property
    def is_authenticated(self):
        return True

    @property
    def is_anonymous(self):
        return False

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}".strip()

    @property
    def primary_app_role(self):
        return self.app_roles[0] if self.app_roles else "member"

    def has_app_role(self, role):
        return role in (self.app_roles or [])


class ProjectMembership(models.Model):
    """Lien Utilisateur ↔ Projet avec un ou plusieurs rôles sur ce projet."""

    user = models.ForeignKey(AppUser, related_name="memberships",
                             on_delete=models.CASCADE)
    project = models.ForeignKey("projects.Project", related_name="memberships",
                                on_delete=models.CASCADE)
    roles = models.JSONField("Rôles sur le projet", default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [("user", "project")]
        ordering = ["id"]
        verbose_name = "Adhésion projet"
        verbose_name_plural = "Adhésions projet"

    def __str__(self):
        return f"{self.user} @ {self.project} {self.roles}"
