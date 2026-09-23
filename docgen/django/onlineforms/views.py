import io
import json

import qrcode
from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.http import HttpResponse
from django.shortcuts import get_object_or_404, redirect, render

from .models import FormSubmission, OnlineForm


@login_required
def form_list(request):
    return render(request, "onlineforms/form_list.html",
                  {"forms": OnlineForm.objects.all()})


@login_required
def form_edit(request, pk=None):
    form = get_object_or_404(OnlineForm, pk=pk) if pk else None
    if request.method == "POST":
        title = request.POST.get("title", "").strip()
        description = request.POST.get("description", "")
        try:
            schema = json.loads(request.POST.get("schema", "[]"))
        except json.JSONDecodeError as e:
            messages.error(request, f"Schéma JSON invalide : {e}")
            schema = form.schema if form else []
            title = title  # keep entered values
        else:
            if form is None:
                form = OnlineForm()
            form.title = title
            form.description = description
            form.schema = schema
            form.is_open = request.POST.get("is_open") == "on"
            form.save()
            messages.success(request, "Formulaire enregistré.")
            return redirect("form_detail", pk=form.pk)
    default_schema = json.dumps(form.schema if form else [
        {"name": "email", "label": "E-mail", "type": "email", "required": True},
        {"name": "message", "label": "Message", "type": "textarea"},
    ], indent=2, ensure_ascii=False)
    return render(request, "onlineforms/form_form.html",
                  {"form_obj": form, "schema_json": default_schema})


@login_required
def form_detail(request, pk):
    form = get_object_or_404(OnlineForm, pk=pk)
    return render(request, "onlineforms/form_detail.html", {
        "form_obj": form,
        "submissions": form.submissions.all(),
    })


@login_required
def form_qr(request, pk):
    form = get_object_or_404(OnlineForm, pk=pk)
    img = qrcode.make(form.short_url)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return HttpResponse(buf.getvalue(), content_type="image/png")


# ---- Public (no login) ----
def public_form(request, code):
    form = get_object_or_404(OnlineForm, code=code)
    if not form.is_open:
        return render(request, "onlineforms/public_closed.html", {"form_obj": form})
    if request.method == "POST":
        answers = {}
        for field in form.schema:
            name = field.get("name")
            answers[name] = request.POST.get(name, "")
        FormSubmission.objects.create(form=form, answers=answers)
        return render(request, "onlineforms/public_thanks.html", {"form_obj": form})
    return render(request, "onlineforms/public_form.html", {"form_obj": form})
