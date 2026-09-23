import json

from django.shortcuts import render, get_object_or_404
from django.http import JsonResponse, FileResponse, Http404
from django.views.decorators.http import require_http_methods

from .models import Document, DocumentTemplate, DocType, Confidentiality
from .services import regenerate_document
from projects.models import Project


def document_studio(request):
    """Interface de création/génération de documents (Vuetify)."""
    return render(request, "documents/studio.html")


def document_detail(request, pk):
    document = get_object_or_404(Document, pk=pk)
    return render(request, "documents/document_detail.html", {"document": document})


# --- API ------------------------------------------------------------------

@require_http_methods(["GET"])
def meta_api(request):
    """Métadonnées : types de documents, niveaux de confidentialité, modèles."""
    return JsonResponse({
        "doc_types": [{"value": v, "label": l} for v, l in DocType.choices],
        "confidentiality": [{"value": v, "label": l} for v, l in Confidentiality.choices],
        "templates": [
            {
                "id": t.id, "name": t.name, "doc_type": t.doc_type,
                "description": t.description, "variables_schema": t.variables_schema,
            }
            for t in DocumentTemplate.objects.all()
        ],
        "projects": [
            {"id": p.id, "name": p.name, "client_name": p.client_name}
            for p in Project.objects.all()
        ],
    })


@require_http_methods(["GET", "POST"])
def documents_api(request):
    if request.method == "GET":
        qs = Document.objects.select_related("project").all()
        project_id = request.GET.get("project")
        if project_id:
            qs = qs.filter(project_id=project_id)
        return JsonResponse({"results": [_document_to_dict(d) for d in qs]})

    # POST : création + première génération
    payload = json.loads(request.body or "{}")
    project = get_object_or_404(Project, pk=payload.get("project"))
    document = Document.objects.create(
        project=project,
        template_id=payload.get("template") or None,
        title=payload.get("title", "Document sans titre"),
        doc_type=payload.get("doc_type", DocType.PDF_TRACKING),
        confidentiality=payload.get("confidentiality", Confidentiality.INTERNAL),
        data=payload.get("data", {}) or {},
    )
    version = regenerate_document(
        document,
        author_initials=payload.get("author_initials", "?"),
        comment=payload.get("comment", "Création du document"),
    )
    result = _document_to_dict(document, full=True)
    result["created_version"] = version.version_number
    return JsonResponse(result, status=201)


@require_http_methods(["GET", "POST", "DELETE"])
def document_api(request, pk):
    document = get_object_or_404(Document, pk=pk)

    if request.method == "GET":
        return JsonResponse(_document_to_dict(document, full=True))

    if request.method == "DELETE":
        document.delete()
        return JsonResponse({"deleted": True})

    # POST : mise à jour des données puis régénération (nouvelle version)
    payload = json.loads(request.body or "{}")
    for field in ["title", "confidentiality"]:
        if field in payload:
            setattr(document, field, payload[field])
    if "data" in payload:
        document.data = payload["data"] or {}
    document.save()

    version = regenerate_document(
        document,
        author_initials=payload.get("author_initials", "?"),
        comment=payload.get("comment", "Mise à jour du document"),
    )
    result = _document_to_dict(document, full=True)
    result["created_version"] = version.version_number
    return JsonResponse(result)


@require_http_methods(["GET"])
def document_download(request, pk):
    """Télécharge le fichier courant du document."""
    document = get_object_or_404(Document, pk=pk)
    if not document.current_file:
        raise Http404("Aucun fichier généré")
    return FileResponse(
        document.current_file.open("rb"), as_attachment=True,
        filename=document.current_file.name.split("/")[-1],
    )


@require_http_methods(["GET"])
def version_download(request, pk, version_number):
    """Télécharge le fichier d'une version d'historique."""
    document = get_object_or_404(Document, pk=pk)
    version = get_object_or_404(document.versions, version_number=version_number)
    if not version.file:
        raise Http404("Aucun fichier pour cette version")
    return FileResponse(
        version.file.open("rb"), as_attachment=True,
        filename=version.file.name.split("/")[-1],
    )


# --- Sérialisation --------------------------------------------------------

def _document_to_dict(d, full=False):
    data = {
        "id": d.id,
        "title": d.title,
        "doc_type": d.doc_type,
        "doc_type_label": d.get_doc_type_display(),
        "confidentiality": d.confidentiality,
        "confidentiality_label": d.get_confidentiality_display(),
        "current_version": d.current_version,
        "project_id": d.project_id,
        "project_name": d.project.name,
        "download_url": f"/documents/{d.id}/download/" if d.current_file else None,
        "updated_at": d.updated_at.strftime("%d/%m/%Y %H:%M"),
    }
    if full:
        data["data"] = d.data
        data["versions"] = [
            {
                "version_number": v.version_number,
                "comment": v.comment,
                "author_initials": v.author_initials,
                "created_at": v.created_at.strftime("%d/%m/%Y %H:%M"),
                "download_url": f"/documents/{d.id}/versions/{v.version_number}/download/" if v.file else None,
            }
            for v in d.versions.all()
        ]
    return data
