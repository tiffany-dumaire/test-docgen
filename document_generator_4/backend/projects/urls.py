from rest_framework.routers import DefaultRouter

from .views import ClientViewSet, ContactViewSet, ProjectViewSet

router = DefaultRouter()
router.register("clients", ClientViewSet, basename="client")
router.register("contacts", ContactViewSet, basename="contact")
router.register("", ProjectViewSet, basename="project")

urlpatterns = router.urls
