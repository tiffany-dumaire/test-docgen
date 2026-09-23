from django.contrib import admin

from .models import Company, Contact, Project


@admin.register(Company)
class CompanyAdmin(admin.ModelAdmin):
    list_display = ("name", "email", "phone", "updated_at")


@admin.register(Contact)
class ContactAdmin(admin.ModelAdmin):
    list_display = ("first_name", "last_name", "kind", "role", "email")
    list_filter = ("kind",)
    search_fields = ("first_name", "last_name", "email")


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ("name", "client_name", "internal_contact", "updated_at")
    search_fields = ("name", "client_name")
