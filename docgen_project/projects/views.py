import json

from django.shortcuts import render, get_object_or_404
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods

from .models import Project, Contact


def project_list(request):
    return render(request, "projects/project_list.html")


def project_detail(request, pk):
    project = get_object_or_404(Project, pk=pk)
    return render(request, "projects/project_detail.html", {"project": project})


# --- API ------------------------------------------------------------------

@require_http_methods(["GET", "POST"])
def projects_api(request):
    if request.method == "GET":
        data = [_project_to_dict(p) for p in Project.objects.all()]
        return JsonResponse({"results": data})

    payload = json.loads(request.body or "{}")
    project = Project.objects.create(
        name=payload.get("name", "Nouveau projet"),
        client_name=payload.get("client_name", ""),
        description=payload.get("description", ""),
        client_contact_id=payload.get("client_contact") or None,
        internal_contact_id=payload.get("internal_contact") or None,
    )
    return JsonResponse(_project_to_dict(project), status=201)


@require_http_methods(["GET", "POST", "DELETE"])
def project_api(request, pk):
    project = get_object_or_404(Project, pk=pk)

    if request.method == "GET":
        return JsonResponse(_project_to_dict(project, full=True))

    if request.method == "DELETE":
        project.delete()
        return JsonResponse({"deleted": True})

    payload = json.loads(request.body or "{}")
    for field in ["name", "client_name", "description"]:
        if field in payload:
            setattr(project, field, payload[field] or "")
    if "client_contact" in payload:
        project.client_contact_id = payload["client_contact"] or None
    if "internal_contact" in payload:
        project.internal_contact_id = payload["internal_contact"] or None
    project.save()
    return JsonResponse(_project_to_dict(project, full=True))


@require_http_methods(["POST"])
def project_logo_api(request, pk):
    project = get_object_or_404(Project, pk=pk)
    if "logo" in request.FILES:
        project.logo = request.FILES["logo"]
        project.save()
    return JsonResponse(_project_to_dict(project, full=True))


@require_http_methods(["GET", "POST"])
def contacts_api(request):
    if request.method == "GET":
        ctype = request.GET.get("type")
        qs = Contact.objects.all()
        if ctype:
            qs = qs.filter(contact_type=ctype)
        return JsonResponse({"results": [_contact_to_dict(c) for c in qs]})

    payload = json.loads(request.body or "{}")
    contact = Contact.objects.create(
        first_name=payload.get("first_name", ""),
        last_name=payload.get("last_name", ""),
        contact_type=payload.get("contact_type", Contact.CLIENT),
        role=payload.get("role", ""),
        email=payload.get("email", ""),
        phone=payload.get("phone", ""),
    )
    return JsonResponse(_contact_to_dict(contact), status=201)


# --- Sérialisation --------------------------------------------------------

def _contact_to_dict(c):
    return {
        "id": c.id,
        "first_name": c.first_name,
        "last_name": c.last_name,
        "full_name": c.full_name,
        "contact_type": c.contact_type,
        "role": c.role,
        "email": c.email,
        "phone": c.phone,
        "initials": c.initials,
    }


def _project_to_dict(p, full=False):
    d = {
        "id": p.id,
        "name": p.name,
        "client_name": p.client_name,
        "description": p.description,
        "logo_url": p.logo.url if p.logo else None,
        "client_contact": _contact_to_dict(p.client_contact) if p.client_contact else None,
        "internal_contact": _contact_to_dict(p.internal_contact) if p.internal_contact else None,
        "documents_count": p.documents_count,
        "created_at": p.created_at.strftime("%d/%m/%Y"),
    }
    if full:
        from documents.views import _document_to_dict
        d["documents"] = [_document_to_dict(doc) for doc in p.documents.all()]
        d["forms"] = [
            {
                "id": f.id, "title": f.title, "short_url": f.short_url,
                "submissions_count": f.submissions_count, "is_active": f.is_active,
            }
            for f in p.forms.all()
        ]
    return d
