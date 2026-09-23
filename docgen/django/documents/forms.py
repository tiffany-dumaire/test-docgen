import json

from django import forms

from .models import Document, DocumentTemplate


class TemplateForm(forms.ModelForm):
    class Meta:
        model = DocumentTemplate
        fields = [
            "name", "kind", "description", "is_generic",
            "background_image", "background_pdf", "default_confidentiality",
        ]
        widgets = {"description": forms.Textarea(attrs={"rows": 2})}


class DocumentForm(forms.ModelForm):
    data_json = forms.CharField(
        label="Données & variables (JSON)", required=False,
        widget=forms.Textarea(attrs={"rows": 10, "class": "mono"}),
        help_text='Ex : {"params": {"total": 1200}, "rows": [{"product": "A", '
                  '"amount": 1200}]}')

    class Meta:
        model = Document
        fields = ["template", "project", "title", "confidentiality"]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if self.instance and self.instance.pk:
            self.fields["data_json"].initial = json.dumps(
                self.instance.data or {}, indent=2, ensure_ascii=False)

    def clean_data_json(self):
        raw = self.cleaned_data.get("data_json", "").strip()
        if not raw:
            return {}
        try:
            return json.loads(raw)
        except json.JSONDecodeError as e:
            raise forms.ValidationError(f"JSON invalide : {e}")

    def save(self, commit=True):
        obj = super().save(commit=False)
        obj.data = self.cleaned_data.get("data_json", {})
        if commit:
            obj.save()
        return obj


class RegenerateForm(forms.Form):
    comment = forms.CharField(
        label="Commentaire de version", widget=forms.Textarea(attrs={"rows": 2}),
        required=False)
    initials = forms.CharField(label="Initiales", max_length=8, required=False)
