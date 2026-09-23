from django.conf import settings
from django.shortcuts import get_object_or_404, redirect
from rest_framework import status, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from .models import FormSubmission, OnlineForm, ShortLink
from .serializers import (FormSubmissionSerializer, OnlineFormSerializer,
                          PublicFormSerializer, ShortLinkSerializer)


def _client_ip(request):
    xff = request.META.get("HTTP_X_FORWARDED_FOR")
    if xff:
        return xff.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")


class OnlineFormViewSet(viewsets.ModelViewSet):
    queryset = OnlineForm.objects.select_related("short_link", "project").all()
    serializer_class = OnlineFormSerializer
    filterset_fields = ["project", "is_open", "confidentiality"]
    search_fields = ["title", "description"]

    @action(detail=True, methods=["get"])
    def submissions(self, request, pk=None):
        form = self.get_object()
        data = FormSubmissionSerializer(
            form.submissions.all(), many=True).data
        return Response(data)


class ShortLinkViewSet(viewsets.ModelViewSet):
    queryset = ShortLink.objects.all()
    serializer_class = ShortLinkSerializer


class FormSubmissionViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = FormSubmission.objects.select_related("form").all()
    serializer_class = FormSubmissionSerializer
    filterset_fields = ["form"]


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
    return Response(PublicFormSerializer(form).data)


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

    # Validation des champs requis d'après le schéma
    missing = []
    for field in form.schema:
        if field.get("required") and not str(data.get(field["key"], "")).strip():
            missing.append(field.get("label", field["key"]))
    if missing:
        return Response(
            {"detail": "Champs obligatoires manquants.", "fields": missing},
            status=status.HTTP_400_BAD_REQUEST)

    FormSubmission.objects.create(
        form=form, data=data, respondent_ip=_client_ip(request))
    return Response({"detail": form.success_message},
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
