from rest_framework import viewsets
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser

from .models import (Client, Contact, JournalEntry, Meeting, Project,
                     ProjectLink)
from .serializers import (ClientSerializer, ContactSerializer,
                          JournalEntrySerializer, MeetingSerializer,
                          ProjectLinkSerializer, ProjectSerializer)


class ProjectViewSet(viewsets.ModelViewSet):
    queryset = (Project.objects
                .select_related("client")
                .prefetch_related("contacts", "documents",
                                  "assignments__member__team").all())
    serializer_class = ProjectSerializer
    parser_classes = [JSONParser, MultiPartParser, FormParser]
    filterset_fields = ["status", "client_name", "client"]
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


class ClientViewSet(viewsets.ModelViewSet):
    queryset = Client.objects.prefetch_related("projects").all()
    serializer_class = ClientSerializer
    search_fields = ["name", "contact_name", "email"]
    ordering_fields = ["name", "created_at"]


class MeetingViewSet(viewsets.ModelViewSet):
    queryset = Meeting.objects.prefetch_related("documents").all()
    serializer_class = MeetingSerializer
    filterset_fields = ["project"]
    ordering_fields = ["date", "created_at"]


class JournalEntryViewSet(viewsets.ModelViewSet):
    queryset = JournalEntry.objects.all()
    serializer_class = JournalEntrySerializer
    filterset_fields = ["project", "meeting", "category", "confidentiality"]


class ProjectLinkViewSet(viewsets.ModelViewSet):
    queryset = ProjectLink.objects.all()
    serializer_class = ProjectLinkSerializer
    filterset_fields = ["project", "category"]
