from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.shortcuts import get_object_or_404, redirect, render

from documents.models import Document
from onlineforms.models import OnlineForm

from .forms import CompanyForm, ContactForm, ProjectForm
from .models import Company, Contact, Project


@login_required
def dashboard(request):
    ctx = {
        "projects": Project.objects.all()[:6],
        "n_projects": Project.objects.count(),
        "n_documents": Document.objects.count(),
        "n_forms": OnlineForm.objects.count(),
        "recent_documents": Document.objects.select_related("project")[:8],
    }
    return render(request, "core/dashboard.html", ctx)


@login_required
def project_list(request):
    return render(request, "core/project_list.html",
                  {"projects": Project.objects.all()})


@login_required
def project_detail(request, pk):
    project = get_object_or_404(Project, pk=pk)
    return render(request, "core/project_detail.html", {
        "project": project,
        "documents": project.documents.all(),
        "forms": project.online_forms.all(),
    })


@login_required
def project_edit(request, pk=None):
    project = get_object_or_404(Project, pk=pk) if pk else None
    if request.method == "POST":
        form = ProjectForm(request.POST, request.FILES, instance=project)
        if form.is_valid():
            obj = form.save()
            messages.success(request, "Projet enregistré.")
            return redirect("project_detail", pk=obj.pk)
    else:
        form = ProjectForm(instance=project)
    return render(request, "core/project_form.html",
                  {"form": form, "project": project})


@login_required
def contact_list(request):
    if request.method == "POST":
        form = ContactForm(request.POST)
        if form.is_valid():
            form.save()
            messages.success(request, "Contact ajouté.")
            return redirect("contact_list")
    else:
        form = ContactForm()
    return render(request, "core/contact_list.html", {
        "form": form,
        "clients": Contact.objects.filter(kind=Contact.KIND_CLIENT),
        "internals": Contact.objects.filter(kind=Contact.KIND_INTERNAL),
    })


@login_required
def company_settings(request):
    company = Company.get_solo()
    if request.method == "POST":
        form = CompanyForm(request.POST, request.FILES, instance=company)
        if form.is_valid():
            form.save()
            messages.success(request, "Informations société mises à jour.")
            return redirect("company_settings")
    else:
        form = CompanyForm(instance=company)
    return render(request, "core/company_settings.html", {"form": form})
