from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import CompanyProfileView, TeamMemberViewSet, TeamViewSet

router = DefaultRouter()
router.register("teams", TeamViewSet, basename="team")
router.register("members", TeamMemberViewSet, basename="teammember")

urlpatterns = [
    path("", CompanyProfileView.as_view(), name="company-profile"),
] + router.urls
