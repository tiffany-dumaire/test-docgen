from rest_framework import status, viewsets
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
        primary = request.query_params.get("primary")
        svg = TD.render(kind, project.tracking or {}, primary=primary)
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

    def perform_create(self, serializer):
        from . import journal
        contact = serializer.save()
        if contact.project_id:
            journal.log_project(
                contact.project, "contact_added",
                f"Contact {contact.full_name} ({contact.get_kind_display()}) "
                f"ajouté au projet.")

    def perform_destroy(self, instance):
        from . import journal
        project = instance.project
        name = instance.full_name
        kind = instance.get_kind_display()
        super().perform_destroy(instance)
        if project is not None:
            journal.log_project(
                project, "contact_removed",
                f"Contact {name} ({kind}) retiré du projet.")


class ClientViewSet(viewsets.ModelViewSet):
    queryset = Client.objects.prefetch_related("projects").all()
    serializer_class = ClientSerializer
    search_fields = ["name", "contact_name", "email"]
    ordering_fields = ["name", "created_at"]

    _CONTACT_FIELDS = ("contact_name", "email", "phone", "address")

    def perform_update(self, serializer):
        from . import journal
        before = {f: getattr(serializer.instance, f) for f in self._CONTACT_FIELDS}
        client = serializer.save()
        changed = [f for f in self._CONTACT_FIELDS
                   if before[f] != getattr(client, f)]
        if changed:
            journal.log_client(
                client, "contact_changed",
                "Coordonnées / contact du client mises à jour.")

    def _client_journal_qs(self, client):
        from django.db.models import Q
        from .models import JournalEntry
        return (JournalEntry.objects
                .filter(Q(client=client) | Q(project__client=client)
                        | Q(project__clients=client))
                .select_related("project").distinct().order_by("-created_at"))

    @action(detail=True, methods=["get", "post"])
    def journal(self, request, pk=None):
        """Journal agrégé du client (événements de ses projets + entrées client)."""
        from .serializers import JournalEntrySerializer
        client = self.get_object()
        if request.method == "POST":
            data = dict(request.data)
            data["client"] = client.id
            data.pop("project", None)
            ser = JournalEntrySerializer(data=data)
            ser.is_valid(raise_exception=True)
            ser.save()
            return Response(ser.data, status=status.HTTP_201_CREATED)
        entries = self._client_journal_qs(client)[:300]
        return Response(JournalEntrySerializer(entries, many=True).data)

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
        from .serializers import JournalEntrySerializer
        journal = self._client_journal_qs(client)[:200]
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
            "journal": JournalEntrySerializer(journal, many=True).data,
        })


class MeetingViewSet(viewsets.ModelViewSet):
    queryset = Meeting.objects.prefetch_related("documents").all()
    serializer_class = MeetingSerializer
    filterset_fields = ["project"]
    ordering_fields = ["date", "created_at"]

    def perform_update(self, serializer):
        from . import journal
        was_cancelled = serializer.instance.cancelled
        meeting = serializer.save()
        # Journalise l'annulation (passage à « annulée »).
        if meeting.cancelled and not was_cancelled and meeting.project_id:
            journal.log_project(
                meeting.project, "meeting_cancelled",
                f"Réunion « {meeting.title} » annulée.", meeting=meeting)


class JournalEntryViewSet(viewsets.ModelViewSet):
    queryset = JournalEntry.objects.all()
    serializer_class = JournalEntrySerializer
    filterset_fields = ["project", "client", "meeting", "category",
                        "confidentiality", "is_automatic"]


class ProjectLinkViewSet(viewsets.ModelViewSet):
    queryset = ProjectLink.objects.all()
    serializer_class = ProjectLinkSerializer
    filterset_fields = ["project", "category"]
