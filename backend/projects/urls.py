from rest_framework.routers import DefaultRouter

from .views import (ClientViewSet, ContactViewSet, JournalEntryViewSet,
                    MeetingViewSet, ProjectLinkViewSet, ProjectViewSet)

router = DefaultRouter()
router.register("clients", ClientViewSet, basename="client")
router.register("meetings", MeetingViewSet, basename="meeting")
router.register("journal", JournalEntryViewSet, basename="journal")
router.register("links", ProjectLinkViewSet, basename="projectlink")
router.register("contacts", ContactViewSet, basename="contact")
router.register("", ProjectViewSet, basename="project")

urlpatterns = router.urls
