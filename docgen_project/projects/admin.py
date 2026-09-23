from django.contrib import admin
from .models import Project, Contact


@admin.register(Contact)
class ContactAdmin(admin.ModelAdmin):
    list_display = ("full_name", "contact_type", "role", "email", "phone", "initials")
    list_filter = ("contact_type",)
    search_fields = ("first_name", "last_name", "email")


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ("name", "client_name", "client_contact", "internal_contact", "documents_count", "created_at")
    search_fields = ("name", "client_name")
    autocomplete_fields = ()
