import copy

from django.conf import settings
from django.http import HttpResponse
from django.shortcuts import get_object_or_404, redirect
from rest_framework import status, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import FormSubmission, FormTemplate, OnlineForm, ShortLink
from .serializers import (FormSubmissionSerializer, FormTemplateSerializer,
                          OnlineFormSerializer, PublicFormSerializer,
                          ShortLinkSerializer)


def _client_ip(request):
    xff = request.META.get("HTTP_X_FORWARDED_FOR")
    if xff:
        return xff.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")


class FormTemplateViewSet(viewsets.ModelViewSet):
    """Modèles de formulaire réutilisables (avec diagrammes)."""
    queryset = FormTemplate.objects.all().prefetch_related("projects")
    serializer_class = FormTemplateSerializer
    filterset_fields = ["is_active", "scope", "language"]
    search_fields = ["name", "description"]

    def get_queryset(self):
        qs = FormTemplate.objects.all().prefetch_related("projects")
        project = self.request.query_params.get("project")
        if project:
            from django.db.models import Q
            qs = qs.filter(
                Q(scope=FormTemplate.SCOPE_GLOBAL) | Q(projects__id=project)
            ).distinct()
        return qs

    @action(detail=True, methods=["post"])
    def instantiate(self, request, pk=None):
        """Génère un formulaire en ligne à partir de ce modèle.

        Corps : { "project": <id|null>, "title": "..." (facultatif) }.
        """
        template = self.get_object()
        project_id = request.data.get("project")
        project = None
        if project_id:
            from projects.models import Project
            project = Project.objects.filter(pk=project_id).first()
        title = request.data.get("title") or template.name
        form = OnlineForm.objects.create(
            title=title,
            description=template.description,
            project=project,
            template=template,
            schema=copy.deepcopy(template.schema),
            diagrams=copy.deepcopy(template.diagrams),
            report_template=template.report_template,
            confidentiality=template.confidentiality,
            success_message=template.success_message,
        )
        form.ensure_short_link()
        return Response(OnlineFormSerializer(form, context={"request": request}).data,
                        status=status.HTTP_201_CREATED)


class OnlineFormViewSet(viewsets.ModelViewSet):
    queryset = OnlineForm.objects.select_related(
        "short_link", "project", "template").all()
    serializer_class = OnlineFormSerializer
    filterset_fields = ["project", "is_open", "confidentiality", "template"]
    search_fields = ["title", "description"]

    @action(detail=True, methods=["get"])
    def submissions(self, request, pk=None):
        form = self.get_object()
        data = FormSubmissionSerializer(
            form.submissions.all(), many=True).data
        return Response(data)

    @action(detail=True, methods=["post"])
    def generate_report(self, request, pk=None):
        """Génère un document (Word/PDF) de rapport statistiques à partir du
        modèle de rapport lié, en y insérant les diagrammes du formulaire."""
        from documents.models import Document, ConfidentialityLevel
        from documents.services import generate_version
        form = self.get_object()
        template = form.report_template
        if template is None:
            return Response(
                {"detail": "Aucun modèle de rapport lié à ce formulaire."},
                status=status.HTTP_400_BAD_REQUEST)
        project = form.project
        if project is None:
            from projects.models import Project
            project = Project.objects.first()
        if project is None:
            return Response({"detail": "Aucun projet disponible."},
                            status=status.HTTP_400_BAD_REQUEST)
        doc = Document.objects.create(
            project=project, template=template,
            title=f"Rapport — {form.title}",
            confidentiality=ConfidentialityLevel.INTERNAL,
            data={"__form_id__": form.id})
        version = generate_version(
            doc, author_initials="—",
            comment=f"Rapport statistiques du formulaire « {form.title} »",
            data={"__form_id__": form.id})
        from documents.serializers import DocumentSerializer
        return Response({
            "document": DocumentSerializer(doc, context={"request": request}).data,
            "version_id": version.id,
            "detail": "Rapport généré.",
        }, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["get"])
    def diagrams_data(self, request, pk=None):
        """Jeux de données calculés pour chaque diagramme (aperçu côté UI)."""
        from .diagrams import compute_series
        form = self.get_object()
        subs = list(form.submissions.values_list("data", flat=True))
        out = []
        for cfg in (form.diagrams or []):
            try:
                series = compute_series(cfg, form.schema, subs)
            except Exception as exc:  # config incomplète
                series = {"title": cfg.get("title", ""), "labels": [],
                          "values": [], "error": str(exc)}
            out.append({"config": cfg, "series": series})
        return Response({"count": len(subs), "diagrams": out})

    @action(detail=True, methods=["get"])
    def diagram(self, request, pk=None):
        """Exporte un diagramme en PNG ou SVG.

        Query : ?id=<id du diagramme>&format=png|svg
        """
        from .diagrams import render as render_diagram
        form = self.get_object()
        did = request.query_params.get("id")
        # NB : on évite le paramètre « format » (négociation de contenu DRF).
        fmt = (request.query_params.get("fmt")
               or request.query_params.get("format") or "png").lower()
        cfg = next((c for c in (form.diagrams or []) if str(c.get("id")) == str(did)),
                   None)
        if cfg is None:
            return Response({"detail": "Diagramme introuvable."},
                            status=status.HTTP_404_NOT_FOUND)
        subs = list(form.submissions.values_list("data", flat=True))
        data, mime, ext = render_diagram(cfg, form.schema, subs, fmt=fmt)
        resp = HttpResponse(data, content_type=mime)
        fname = f"diagramme-{did}{ext}"
        disp = "attachment" if request.query_params.get("download") else "inline"
        resp["Content-Disposition"] = f'{disp}; filename="{fname}"'
        return resp


class ShortLinkViewSet(viewsets.ModelViewSet):
    queryset = ShortLink.objects.all()
    serializer_class = ShortLinkSerializer


class FormSubmissionViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = FormSubmission.objects.select_related("form").all()
    serializer_class = FormSubmissionSerializer
    filterset_fields = ["form"]


class FormAssetUploadView(APIView):
    """Téléversement authentifié d'un fichier réutilisable dans l'éditeur de
    formulaire (image d'illustration, fichier modèle, information fixe)."""

    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        from .models import FormAsset
        f = request.FILES.get("file")
        if not f:
            return Response({"detail": "Aucun fichier fourni."},
                            status=status.HTTP_400_BAD_REQUEST)
        asset = FormAsset.objects.create(file=f, name=f.name)
        url = request.build_absolute_uri(asset.file.url)
        return Response({"id": asset.id, "url": url, "name": asset.name},
                        status=status.HTTP_201_CREATED)


# ---------------------------------------------------------------------------
# Endpoints publics
# ---------------------------------------------------------------------------
@api_view(["GET"])
@permission_classes([AllowAny])
def public_form(request, code):
    """Renvoie la définition d'un formulaire à partir d'un code de lien réduit."""
    link = get_object_or_404(ShortLink, code=code)
    form = getattr(link, "form", None)
    if form is None:
        return Response({"detail": "Aucun formulaire lié à ce code."},
                        status=status.HTTP_404_NOT_FOUND)
    return Response(PublicFormSerializer(form, context={"request": request}).data)


@api_view(["POST"])
@permission_classes([AllowAny])
def public_submit(request, code):
    """Enregistre une réponse à un formulaire public."""
    link = get_object_or_404(ShortLink, code=code)
    form = getattr(link, "form", None)
    if form is None:
        return Response({"detail": "Formulaire introuvable."},
                        status=status.HTTP_404_NOT_FOUND)
    if not form.is_open:
        return Response({"detail": "Ce formulaire n'accepte plus de réponses."},
                        status=status.HTTP_400_BAD_REQUEST)

    data = request.data.get("data", request.data)

    # Validation des champs requis d'après le schéma (sections + questions).
    from .schema_utils import iter_questions, question_answered
    missing = []
    for q in iter_questions(form.schema):
        if q.get("required") and not question_answered(q, data.get(q["key"])):
            missing.append(q.get("label", q["key"]))
    if missing:
        return Response(
            {"detail": "Champs obligatoires manquants.", "fields": missing},
            status=status.HTTP_400_BAD_REQUEST)

    FormSubmission.objects.create(
        form=form, data=data, respondent_ip=_client_ip(request))
    return Response({"detail": form.success_message},
                    status=status.HTTP_201_CREATED)


MAX_UPLOAD_BYTES = 15 * 1024 * 1024  # 15 Mo


@api_view(["POST"])
@permission_classes([AllowAny])
def public_upload(request, code):
    """Dépôt public d'un fichier en réponse à une question « fichier »."""
    from .models import FormUpload
    link = get_object_or_404(ShortLink, code=code)
    form = getattr(link, "form", None)
    if form is None or not form.is_open:
        return Response({"detail": "Formulaire indisponible."},
                        status=status.HTTP_400_BAD_REQUEST)
    f = request.FILES.get("file")
    if not f:
        return Response({"detail": "Aucun fichier fourni."},
                        status=status.HTTP_400_BAD_REQUEST)
    if f.size > MAX_UPLOAD_BYTES:
        return Response({"detail": "Fichier trop volumineux (max 15 Mo)."},
                        status=status.HTTP_400_BAD_REQUEST)
    up = FormUpload.objects.create(
        form=form, field_key=request.data.get("field", ""),
        file=f, original_name=f.name)
    url = request.build_absolute_uri(up.file.url)
    return Response({"id": up.id, "url": url, "name": up.original_name},
                    status=status.HTTP_201_CREATED)


def resolve_short_link(request, code):
    """
    Résolution publique d'un lien réduit /s/<code> :
      - incrémente le compteur de clics,
      - redirige vers le formulaire (page Angular) ou l'URL cible.
    """
    link = get_object_or_404(ShortLink, code=code)
    ShortLink.objects.filter(pk=link.pk).update(click_count=link.click_count + 1)

    if getattr(link, "form", None) is not None:
        return redirect(f"{settings.FRONTEND_BASE_URL}/f/{link.code}")
    if link.target_url:
        return redirect(link.target_url)
    return redirect(f"{settings.FRONTEND_BASE_URL}/f/{link.code}")
