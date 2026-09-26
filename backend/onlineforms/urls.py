from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import (FormAssetUploadView, FormSubmissionViewSet,
                    FormTemplateViewSet, OnlineFormViewSet, ShortLinkViewSet,
                    public_form, public_submit, public_upload)

router = DefaultRouter()
router.register("forms", OnlineFormViewSet, basename="form")
router.register("form-templates", FormTemplateViewSet, basename="form-template")
router.register("shortlinks", ShortLinkViewSet, basename="shortlink")
router.register("submissions", FormSubmissionViewSet, basename="submission")

urlpatterns = [
    path("assets/", FormAssetUploadView.as_view(), name="form-asset-upload"),
    path("public/<str:code>/", public_form, name="public-form"),
    path("public/<str:code>/submit/", public_submit, name="public-submit"),
    path("public/<str:code>/upload/", public_upload, name="public-upload"),
] + router.urls
