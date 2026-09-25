from django.contrib import admin

from .models import Document, DocumentTemplate, DocumentVersion


@admin.register(DocumentTemplate)
class DocumentTemplateAdmin(admin.ModelAdmin):
    list_display = ("name", "doc_type", "builder_key", "is_active", "is_system")
    list_filter = ("doc_type", "is_active", "is_system")
    search_fields = ("name", "slug")


class DocumentVersionInline(admin.TabularInline):
    model = DocumentVersion
    extra = 0
    readonly_fields = ("version_number", "author_initials", "confidentiality",
                       "comment", "file", "created_at")


@admin.register(Document)
class DocumentAdmin(admin.ModelAdmin):
    list_display = ("title", "project", "template", "confidentiality",
                    "current_version", "updated_at")
    list_filter = ("confidentiality", "template__doc_type")
    search_fields = ("title",)
    inlines = [DocumentVersionInline]
