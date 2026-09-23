from django import forms

from .models import Company, Contact, Project


class ProjectForm(forms.ModelForm):
    class Meta:
        model = Project
        fields = [
            "name", "client_name", "logo", "description",
            "client_contact", "internal_contact",
        ]
        widgets = {
            "description": forms.Textarea(attrs={"rows": 3}),
        }


class ContactForm(forms.ModelForm):
    class Meta:
        model = Contact
        fields = ["kind", "first_name", "last_name", "role", "email", "phone"]


class CompanyForm(forms.ModelForm):
    class Meta:
        model = Company
        fields = [
            "name", "logo", "description", "website_url", "terms_url",
            "other_links", "address", "phone", "email",
        ]
        widgets = {
            "description": forms.Textarea(attrs={"rows": 3}),
            "address": forms.Textarea(attrs={"rows": 2}),
        }
