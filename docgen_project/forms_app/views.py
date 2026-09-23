import io
import json

from django.shortcuts import render, get_object_or_404
from django.http import JsonResponse, HttpResponse, Http404
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt

from .models import OnlineForm, FormSubmission
from documents.models import Confidentiality
from projects.models import Project


def form_builder(request):
    """Interface de création de formulaires (Vuetify)."""
    return render(request, "forms_app/form_builder.html")


def form_submissions_view(request, pk):
    form = get_object_or_404(OnlineForm, pk=pk)
    return render(request, "forms_app/submissions.html", {"form": form})


def public_form(request, short_code):
    """Page publique du formulaire, accessible via le lien réduit /f/<code>/."""
    form = get_object_or_404(OnlineForm, short_code=short_code)
    if not form.is_active:
        raise Http404("Ce formulaire n'est plus actif")
    return render(request, "forms_app/public_form.html", {"form": form})


def qr_code(request, short_code):
    """Génère un QR code PNG pointant vers le lien réduit du formulaire."""
    import qrcode
    form = get_object_or_404(OnlineForm, short_code=short_code)
    img = qrcode.make(form.short_url)
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    buffer.seek(0)
    return HttpResponse(buffer.getvalue(), content_type="image/png")


# --- API ------------------------------------------------------------------

@require_http_methods(["GET", "POST"])
def forms_api(request):
    if request.method == "GET":
        qs = OnlineForm.objects.all()
        project_id = request.GET.get("project")
        if project_id:
            qs = qs.filter(project_id=project_id)
        return JsonResponse({"results": [_form_to_dict(f) for f in qs]})

    payload = json.loads(request.body or "{}")
    form = OnlineForm.objects.create(
        project_id=payload.get("project") or None,
        title=payload.get("title", "Nouveau formulaire"),
        description=payload.get("description", ""),
        fields_schema=payload.get("fields_schema", []) or [],
        confidentiality=payload.get("confidentiality", Confidentiality.INTERNAL),
    )
    return JsonResponse(_form_to_dict(form, full=True), status=201)


@require_http_methods(["GET", "POST", "DELETE"])
def form_api(request, pk):
    form = get_object_or_404(OnlineForm, pk=pk)

    if request.method == "GET":
        return JsonResponse(_form_to_dict(form, full=True))

    if request.method == "DELETE":
        form.delete()
        return JsonResponse({"deleted": True})

    payload = json.loads(request.body or "{}")
    for field in ["title", "description", "confidentiality", "is_active"]:
        if field in payload:
            setattr(form, field, payload[field])
    if "fields_schema" in payload:
        form.fields_schema = payload["fields_schema"] or []
    form.save()
    return JsonResponse(_form_to_dict(form, full=True))


@csrf_exempt
@require_http_methods(["POST"])
def submit_form(request, short_code):
    """Réception publique d'une soumission de formulaire."""
    form = get_object_or_404(OnlineForm, short_code=short_code)
    if not form.is_active:
        return JsonResponse({"error": "Formulaire inactif"}, status=400)

    try:
        data = json.loads(request.body or "{}")
    except json.JSONDecodeError:
        data = dict(request.POST)

    # Validation simple des champs requis
    errors = {}
    for field in form.fields_schema:
        key = field.get("key")
        if field.get("required") and not data.get(key):
            errors[key] = "Champ requis"
    if errors:
        return JsonResponse({"errors": errors}, status=400)

    FormSubmission.objects.create(
        form=form, data=data,
        ip_address=request.META.get("REMOTE_ADDR"),
    )
    return JsonResponse({"success": True, "message": "Merci pour votre réponse !"})


@require_http_methods(["GET"])
def submissions_api(request, pk):
    form = get_object_or_404(OnlineForm, pk=pk)
    submissions = [
        {
            "id": s.id,
            "data": s.data,
            "submitted_at": s.submitted_at.strftime("%d/%m/%Y %H:%M"),
            "ip_address": s.ip_address,
        }
        for s in form.submissions.all()
    ]
    return JsonResponse({
        "form": _form_to_dict(form, full=True),
        "submissions": submissions,
    })


# --- Sérialisation --------------------------------------------------------

def _form_to_dict(f, full=False):
    d = {
        "id": f.id,
        "title": f.title,
        "description": f.description,
        "short_code": f.short_code,
        "short_url": f.short_url,
        "qr_url": f"/f/{f.short_code}/qr/",
        "is_active": f.is_active,
        "confidentiality": f.confidentiality,
        "submissions_count": f.submissions_count,
        "project_id": f.project_id,
        "created_at": f.created_at.strftime("%d/%m/%Y"),
    }
    if full:
        d["fields_schema"] = f.fields_schema
    return d
