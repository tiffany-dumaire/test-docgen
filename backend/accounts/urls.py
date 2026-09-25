from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import (ProjectMembershipViewSet, UserViewSet, auth_config,
                    dev_token, me, pkce_callback, pkce_start, update_prefs)

router = DefaultRouter()
router.register("memberships", ProjectMembershipViewSet, basename="membership")
router.register("users", UserViewSet, basename="appuser")

urlpatterns = [
    path("config/", auth_config, name="auth-config"),
    path("dev-token/", dev_token, name="auth-dev-token"),
    path("login/", pkce_start, name="auth-pkce-start"),
    path("callback/", pkce_callback, name="auth-pkce-callback"),
    path("me/", me, name="auth-me"),
    path("prefs/", update_prefs, name="auth-prefs"),
] + router.urls
