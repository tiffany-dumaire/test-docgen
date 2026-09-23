from rest_framework import viewsets
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser

from .models import Contact, Project
from .serializers import ContactSerializer, ProjectSerializer


class ProjectViewSet(viewsets.ModelViewSet):
    queryset = Project.objects.prefetch_related("contacts", "documents").all()
    serializer_class = ProjectSerializer
    parser_classes = [JSONParser, MultiPartParser, FormParser]
    filterset_fields = ["status", "client_name"]
    search_fields = ["name", "client_name", "reference", "description"]
    ordering_fields = ["updated_at", "created_at", "name"]

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx["request"] = self.request
        return ctx


class ContactViewSet(viewsets.ModelViewSet):
    queryset = Contact.objects.all()
    serializer_class = ContactSerializer
    filterset_fields = ["project", "kind"]
