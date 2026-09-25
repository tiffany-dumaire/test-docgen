from django.contrib import admin

from .models import Contact, Project


class ContactInline(admin.TabularInline):
    model = Contact
    extra = 1


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ("name", "client_name", "status", "reference", "updated_at")
    list_filter = ("status",)
    search_fields = ("name", "client_name", "reference")
    inlines = [ContactInline]
