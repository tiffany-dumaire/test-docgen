from django.contrib import admin
from .models import Document, DocumentVersion, DocumentTemplate


class DocumentVersionInline(admin.TabularInline):
    model = DocumentVersion
    extra = 0
    readonly_fields = ("version_number", "comment", "author_initials", "created_at", "file")
    can_delete = False


@admin.register(DocumentTemplate)
class DocumentTemplateAdmin(admin.ModelAdmin):
    list_display = ("name", "doc_type", "created_at")
    list_filter = ("doc_type",)


@admin.register(Document)
class DocumentAdmin(admin.ModelAdmin):
    list_display = ("title", "project", "doc_type", "confidentiality", "current_version", "updated_at")
    list_filter = ("doc_type", "confidentiality", "project")
    search_fields = ("title",)
    inlines = [DocumentVersionInline]


@admin.register(DocumentVersion)
class DocumentVersionAdmin(admin.ModelAdmin):
    list_display = ("document", "version_number", "author_initials", "created_at")
    list_filter = ("document",)
