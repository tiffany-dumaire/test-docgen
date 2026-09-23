import json

from django.shortcuts import render, redirect
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods

from .models import CompanyProfile, UsefulLink
from projects.models import Project
from documents.models import Document
from forms_app.models import OnlineForm


def dashboard(request):
    """Tableau de bord principal."""
    context = {
        "stats": {
            "projects": Project.objects.count(),
            "documents": Document.objects.count(),
            "forms": OnlineForm.objects.count(),
        },
        "recent_projects": Project.objects.all()[:5],
        "recent_documents": Document.objects.select_related("project")[:5],
    }
    return render(request, "core/dashboard.html", context)


def company_view(request):
    """Page de consultation/édition du profil entreprise (Vuetify)."""
    return render(request, "core/company.html")


@require_http_methods(["GET", "POST"])
def company_api(request):
    """API JSON du profil entreprise."""
    profile = CompanyProfile.get_solo()

    if request.method == "GET":
        return JsonResponse(_company_to_dict(profile))

    # POST : mise à jour des champs texte (JSON)
    payload = json.loads(request.body or "{}")
    for field in ["name", "description", "website", "terms_url", "address", "phone", "email"]:
        if field in payload:
            setattr(profile, field, payload[field] or "")
    profile.save()

    # Liens utiles (remplacement complet si fourni)
    if "useful_links" in payload:
        profile.useful_links.all().delete()
        for i, link in enumerate(payload["useful_links"]):
            if link.get("label") and link.get("url"):
                UsefulLink.objects.create(
                    company=profile, label=link["label"], url=link["url"], order=i
                )

    return JsonResponse(_company_to_dict(profile))


@require_http_methods(["POST"])
def company_logo_api(request):
    """Upload du logo entreprise (multipart)."""
    profile = CompanyProfile.get_solo()
    if "logo" in request.FILES:
        profile.logo = request.FILES["logo"]
        profile.save()
    return JsonResponse(_company_to_dict(profile))


def _company_to_dict(profile):
    return {
        "id": profile.id,
        "name": profile.name,
        "description": profile.description,
        "website": profile.website,
        "terms_url": profile.terms_url,
        "address": profile.address,
        "phone": profile.phone,
        "email": profile.email,
        "logo_url": profile.logo.url if profile.logo else None,
        "useful_links": [
            {"label": l.label, "url": l.url} for l in profile.useful_links.all()
        ],
    }
