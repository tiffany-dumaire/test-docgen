from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import (ProjectMembershipViewSet, UserViewSet, auth_config,
                    dev_token, me, update_prefs)

router = DefaultRouter()
router.register("memberships", ProjectMembershipViewSet, basename="membership")
router.register("users", UserViewSet, basename="appuser")

urlpatterns = [
    path("config/", auth_config, name="auth-config"),
    path("dev-token/", dev_token, name="auth-dev-token"),
    path("me/", me, name="auth-me"),
    path("prefs/", update_prefs, name="auth-prefs"),
] + router.urls
