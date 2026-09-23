import json

from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.http import FileResponse, HttpResponseBadRequest, JsonResponse
from django.shortcuts import get_object_or_404, redirect, render
from django.views.decorators.http import require_POST

from .forms import DocumentForm, RegenerateForm, TemplateForm
from .models import Document, DocumentTemplate
from .services import regenerate


# --------------------------- Templates ---------------------------
@login_required
def template_list(request):
    return render(request, "documents/template_list.html",
                  {"templates": DocumentTemplate.objects.all()})


@login_required
def template_edit(request, pk=None):
    tpl = get_object_or_404(DocumentTemplate, pk=pk) if pk else None
    if request.method == "POST":
        form = TemplateForm(request.POST, request.FILES, instance=tpl)
        if form.is_valid():
            obj = form.save()
            messages.success(request, "Modèle enregistré.")
            if obj.kind == DocumentTemplate.KIND_PDF:
                return redirect("pdf_editor", pk=obj.pk)
            return redirect("template_config", pk=obj.pk)
    else:
        form = TemplateForm(instance=tpl)
    return render(request, "documents/template_form.html",
                  {"form": form, "template": tpl})


@login_required
def template_config(request, pk):
    """Raw JSON editor for Excel/Word template definitions."""
    tpl = get_object_or_404(DocumentTemplate, pk=pk)
    if request.method == "POST":
        try:
            tpl.config = json.loads(request.POST.get("config", "{}"))
            tpl.save()
            messages.success(request, "Définition enregistrée.")
        except json.JSONDecodeError as e:
            messages.error(request, f"JSON invalide : {e}")
        return redirect("template_config", pk=pk)
    return render(request, "documents/template_config.html", {
        "template": tpl,
        "config_json": json.dumps(tpl.config or {}, indent=2, ensure_ascii=False),
    })


@login_required
def pdf_editor(request, pk):
    """Visual editor: drag fields onto the background, save positions."""
    tpl = get_object_or_404(DocumentTemplate, pk=pk, kind=DocumentTemplate.KIND_PDF)
    return render(request, "documents/pdf_editor.html", {
        "template": tpl,
        "config_json": json.dumps(tpl.config or {"fields": []}),
    })


@login_required
@require_POST
def pdf_editor_save(request, pk):
    tpl = get_object_or_404(DocumentTemplate, pk=pk, kind=DocumentTemplate.KIND_PDF)
    try:
        cfg = json.loads(request.body.decode("utf-8"))
    except json.JSONDecodeError:
        return HttpResponseBadRequest("JSON invalide")
    tpl.config = cfg
    tpl.save()
    return JsonResponse({"ok": True})


# --------------------------- Documents ---------------------------
@login_required
def document_list(request):
    return render(request, "documents/document_list.html",
                  {"documents": Document.objects.select_related("template", "project")})


@login_required
def document_edit(request, pk=None):
    doc = get_object_or_404(Document, pk=pk) if pk else None
    if request.method == "POST":
        form = DocumentForm(request.POST, instance=doc)
        if form.is_valid():
            obj = form.save()
            messages.success(request, "Document enregistré.")
            return redirect("document_detail", pk=obj.pk)
    else:
        initial = {}
        if request.GET.get("project"):
            initial["project"] = request.GET["project"]
        form = DocumentForm(instance=doc, initial=initial)
    return render(request, "documents/document_form.html",
                  {"form": form, "document": doc})


@login_required
def document_detail(request, pk):
    doc = get_object_or_404(Document, pk=pk)
    return render(request, "documents/document_detail.html", {
        "document": doc,
        "versions": doc.versions.all(),
        "regen_form": RegenerateForm(),
    })


@login_required
@require_POST
def document_regenerate(request, pk):
    doc = get_object_or_404(Document, pk=pk)
    form = RegenerateForm(request.POST)
    if form.is_valid():
        version = regenerate(
            doc,
            comment=form.cleaned_data["comment"],
            user=request.user,
            initials=form.cleaned_data["initials"],
        )
        messages.success(request, f"Document régénéré (version {version.number}).")
    return redirect("document_detail", pk=pk)


@login_required
def version_download(request, pk):
    from .models import DocumentVersion
    version = get_object_or_404(DocumentVersion, pk=pk)
    return FileResponse(version.file.open("rb"), as_attachment=True,
                        filename=version.file.name.split("/")[-1])
