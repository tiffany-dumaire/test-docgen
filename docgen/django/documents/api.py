"""Minimal external API (no DRF dependency) consumed by the Bruno collection.

Auth: send header ``X-API-Key: <key>``. The key is the env var API_KEY
(default 'dev-api-key'). This is intentionally simple; swap for DRF + real
tokens in production.
"""
import json
import os

from django.http import FileResponse, JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from core.models import Project

from .models import Document, DocumentTemplate
from .services import regenerate

API_KEY = os.environ.get("API_KEY", "dev-api-key")


def _auth(request):
    return request.headers.get("X-API-Key") == API_KEY


def _unauth():
    return JsonResponse({"error": "unauthorized"}, status=401)


@require_http_methods(["GET"])
def api_templates(request):
    if not _auth(request):
        return _unauth()
    data = [{"id": t.id, "name": t.name, "kind": t.kind,
             "is_generic": t.is_generic} for t in DocumentTemplate.objects.all()]
    return JsonResponse({"results": data})


@require_http_methods(["GET"])
def api_projects(request):
    if not _auth(request):
        return _unauth()
    data = [{"id": p.id, "name": p.name, "client_name": p.client_name}
            for p in Project.objects.all()]
    return JsonResponse({"results": data})


@csrf_exempt
@require_http_methods(["POST"])
def api_generate(request):
    """Create a document from a template + data, generate it, return metadata.

    Body::
        {
          "template": <id>, "project": <id|null>, "title": "...",
          "confidentiality": "internal",
          "data": {"params": {...}, "rows": [...]},
          "comment": "Généré via API"
        }
    """
    if not _auth(request):
        return _unauth()
    try:
        payload = json.loads(request.body.decode("utf-8"))
    except json.JSONDecodeError:
        return JsonResponse({"error": "invalid json"}, status=400)

    try:
        template = DocumentTemplate.objects.get(pk=payload["template"])
    except (KeyError, DocumentTemplate.DoesNotExist):
        return JsonResponse({"error": "template not found"}, status=404)

    project = None
    if payload.get("project"):
        project = Project.objects.filter(pk=payload["project"]).first()

    doc = Document.objects.create(
        template=template,
        project=project,
        title=payload.get("title", template.name),
        confidentiality=payload.get("confidentiality",
                                    template.default_confidentiality),
        data=payload.get("data", {}),
    )
    version = regenerate(
        doc, comment=payload.get("comment", "Généré via API"),
        initials=payload.get("initials", "API"))

    return JsonResponse({
        "document_id": doc.id,
        "version": version.number,
        "kind": doc.kind,
        "download_url": f"/documents/api/documents/{doc.id}/download/",
    }, status=201)


@require_http_methods(["GET"])
def api_document_download(request, pk):
    if not _auth(request):
        return _unauth()
    doc = Document.objects.filter(pk=pk).first()
    if not doc or not doc.current_file:
        return JsonResponse({"error": "not found"}, status=404)
    return FileResponse(doc.current_file.open("rb"), as_attachment=True,
                        filename=doc.current_file.name.split("/")[-1])
