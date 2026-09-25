from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
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
                                  "assignments__member__teams").all())
    serializer_class = ProjectSerializer
    parser_classes = [JSONParser, MultiPartParser, FormParser]
    filterset_fields = ["status", "client_name", "client"]
    search_fields = ["name", "client_name", "reference", "description"]
    ordering_fields = ["updated_at", "created_at", "name"]

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx["request"] = self.request
        return ctx

    @action(detail=False, methods=["get"])
    def tracking_types(self, request):
        """Liste des types de diagrammes de suivi disponibles."""
        from . import tracking_diagrams as TD
        return Response([{"key": k, "label": lbl} for k, lbl in TD.TYPES])

    @action(detail=True, methods=["get"])
    def tracking_diagram(self, request, pk=None):
        """Rend un diagramme de suivi de projet en SVG (ou PNG via cairosvg si dispo)."""
        from django.http import HttpResponse
        from . import tracking_diagrams as TD
        project = self.get_object()
        kind = request.query_params.get("type", "gantt")
        svg = TD.render(kind, project.tracking or {})
        svg_bytes = svg if isinstance(svg, bytes) else svg.encode("utf-8")
        fmt = (request.query_params.get("fmt") or "svg").lower()
        if fmt == "png":
            try:
                import cairosvg
                png = cairosvg.svg2png(bytestring=svg_bytes, scale=2)
                resp = HttpResponse(png, content_type="image/png")
            except Exception:
                resp = HttpResponse(svg_bytes, content_type="image/svg+xml")
        else:
            resp = HttpResponse(svg_bytes, content_type="image/svg+xml")
        resp["Content-Disposition"] = f'inline; filename="{kind}.svg"'
        return resp


class ContactViewSet(viewsets.ModelViewSet):
    queryset = Contact.objects.all()
    serializer_class = ContactSerializer
    filterset_fields = ["project", "kind"]


class ClientViewSet(viewsets.ModelViewSet):
    queryset = Client.objects.prefetch_related("projects").all()
    serializer_class = ClientSerializer
    search_fields = ["name", "contact_name", "email"]
    ordering_fields = ["name", "created_at"]

    @action(detail=True, methods=["get"])
    def detail_bundle(self, request, pk=None):
        """Agrège tout ce qui se rapporte au client : projets (principal + associés),
        contacts de ces projets, et réunions (tous projets confondus)."""
        from django.db.models import Q
        from .models import Contact, Meeting, Project
        from .serializers import (ContactSerializer, MeetingSerializer,
                                  ProjectSerializer)
        client = self.get_object()
        projects = (Project.objects
                    .filter(Q(client=client) | Q(clients=client))
                    .distinct()
                    .prefetch_related("contacts", "assignments__member__teams",
                                      "meetings"))
        pids = list(projects.values_list("id", flat=True))
        contacts = Contact.objects.filter(project_id__in=pids)
        meetings = Meeting.objects.filter(project_id__in=pids).order_by("-date", "-id")
        ctx = {"request": request}
        return Response({
            "client": ClientSerializer(client, context=ctx).data,
            "projects": ProjectSerializer(projects, many=True, context=ctx).data,
            "contacts": [
                {**ContactSerializer(c).data,
                 "project": c.project_id, "project_name": c.project.name}
                for c in contacts
            ],
            "meetings": [
                {**MeetingSerializer(m).data, "project_name": m.project.name}
                for m in meetings
            ],
        })


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
