from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import (DocumentAssetViewSet, DocumentTemplateViewSet,
                    DocumentVersionViewSet, DocumentViewSet, choices_view)

router = DefaultRouter()
router.register("templates", DocumentTemplateViewSet, basename="template")
router.register("assets", DocumentAssetViewSet, basename="asset")
router.register("versions", DocumentVersionViewSet, basename="version")
router.register("", DocumentViewSet, basename="document")

urlpatterns = [
    path("choices/", choices_view, name="document-choices"),
] + router.urls
