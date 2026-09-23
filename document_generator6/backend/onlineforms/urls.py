from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import (FormSubmissionViewSet, OnlineFormViewSet, ShortLinkViewSet,
                    public_form, public_submit)

router = DefaultRouter()
router.register("forms", OnlineFormViewSet, basename="form")
router.register("shortlinks", ShortLinkViewSet, basename="shortlink")
router.register("submissions", FormSubmissionViewSet, basename="submission")

urlpatterns = [
    path("public/<str:code>/", public_form, name="public-form"),
    path("public/<str:code>/submit/", public_submit, name="public-submit"),
] + router.urls
