from rest_framework.routers import DefaultRouter

from .views import ContactViewSet, ProjectViewSet

router = DefaultRouter()
router.register("contacts", ContactViewSet, basename="contact")
router.register("", ProjectViewSet, basename="project")

urlpatterns = router.urls
