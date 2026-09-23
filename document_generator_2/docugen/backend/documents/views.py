from django.http import FileResponse, Http404
from rest_framework import status, viewsets
from rest_framework.decorators import action, api_view
from rest_framework.response import Response

from .generators.registry import file_meta
from .models import Document, DocumentTemplate, DocumentVersion
from .serializers import (ChoicesSerializer, DocumentSerializer,
                          DocumentTemplateSerializer,
                          DocumentVersionSerializer, GenerateSerializer)
from .services import generate_version


class DocumentTemplateViewSet(viewsets.ModelViewSet):
    queryset = DocumentTemplate.objects.all()
    serializer_class = DocumentTemplateSerializer
    filterset_fields = ["doc_type", "is_active", "is_system"]
    search_fields = ["name", "slug", "description"]

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.is_system:
            return Response(
                {"detail": "Un modèle système ne peut pas être supprimé."},
                status=status.HTTP_400_BAD_REQUEST)
        return super().destroy(request, *args, **kwargs)

    @action(detail=True, methods=["post"])
    def duplicate(self, request, pk=None):
        """Duplique un modèle (copie éditable, non-système)."""
        src = self.get_object()
        base_slug = f"{src.slug}-copie"
        slug = base_slug
        i = 2
        while DocumentTemplate.objects.filter(slug=slug).exists():
            slug = f"{base_slug}-{i}"; i += 1
        clone = DocumentTemplate.objects.create(
            name=f"{src.name} (copie)", slug=slug, description=src.description,
            doc_type=src.doc_type, builder_key=src.builder_key,
            is_block_based=src.is_block_based, schema=src.schema,
            settings=src.settings, is_active=src.is_active, is_system=False)
        return Response(DocumentTemplateSerializer(clone).data,
                        status=status.HTTP_201_CREATED)


class DocumentViewSet(viewsets.ModelViewSet):
    queryset = (Document.objects.select_related("project", "template")
                .prefetch_related("versions").all())
    serializer_class = DocumentSerializer
    filterset_fields = ["project", "confidentiality", "template"]
    search_fields = ["title"]
    ordering_fields = ["updated_at", "created_at", "title"]

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx["request"] = self.request
        return ctx

    @action(detail=True, methods=["post"])
    def generate(self, request, pk=None):
        """(Re)génère le document : crée une nouvelle version."""
        document = self.get_object()
        payload = GenerateSerializer(data=request.data)
        payload.is_valid(raise_exception=True)
        vd = payload.validated_data
        version = generate_version(
            document,
            author_initials=vd["author_initials"],
            author_name=vd.get("author_name", ""),
            comment=vd.get("comment", ""),
            confidentiality=vd.get("confidentiality"),
            data=vd.get("data"),
        )
        return Response(
            DocumentVersionSerializer(version, context={"request": request}).data,
            status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["get"])
    def versions(self, request, pk=None):
        document = self.get_object()
        qs = document.versions.all()
        data = DocumentVersionSerializer(
            qs, many=True, context={"request": request}).data
        return Response(data)

    @action(detail=True, methods=["post"])
    def duplicate(self, request, pk=None):
        """Duplique un document (données copiées, sans historique de versions)."""
        src = self.get_object()
        import copy
        clone = Document.objects.create(
            project=src.project, template=src.template,
            title=f"{src.title} (copie)", confidentiality=src.confidentiality,
            data=copy.deepcopy(src.data), doc_date=src.doc_date,
            current_version=0)
        return Response(
            DocumentSerializer(clone, context={"request": request}).data,
            status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"])
    def restore(self, request, pk=None):
        """Restaure une version antérieure : recrée une version depuis l'instantané."""
        document = self.get_object()
        version_id = request.data.get("version")
        try:
            src = document.versions.get(pk=version_id)
        except DocumentVersion.DoesNotExist:
            return Response({"detail": "Version introuvable."},
                            status=status.HTTP_404_NOT_FOUND)
        version = generate_version(
            document,
            author_initials=request.data.get("author_initials", "—"),
            author_name=request.data.get("author_name", ""),
            comment=f"Restauration de la version {src.version_number}",
            confidentiality=src.confidentiality,
            data=src.data_snapshot)
        return Response(
            DocumentVersionSerializer(version, context={"request": request}).data,
            status=status.HTTP_201_CREATED)


class DocumentVersionViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = DocumentVersion.objects.select_related("document").all()
    serializer_class = DocumentVersionSerializer
    filterset_fields = ["document"]

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx["request"] = self.request
        return ctx

    @action(detail=True, methods=["get"])
    def download(self, request, pk=None):
        version = self.get_object()
        if not version.file:
            raise Http404("Fichier introuvable")
        _ext, mime = file_meta(version.document.doc_type)
        response = FileResponse(version.file.open("rb"), content_type=mime)
        response["Content-Disposition"] = (
            f'attachment; filename="{version.file.name.split("/")[-1]}"')
        return response


@api_view(["GET"])
def choices_view(request):
    return Response(ChoicesSerializer(instance={}).data)


from rest_framework.parsers import FormParser, MultiPartParser
from .models import DocumentAsset
from .serializers import DocumentAssetSerializer


class DocumentAssetViewSet(viewsets.ModelViewSet):
    queryset = DocumentAsset.objects.all()
    serializer_class = DocumentAssetSerializer
    parser_classes = [MultiPartParser, FormParser]

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx["request"] = self.request
        return ctx
