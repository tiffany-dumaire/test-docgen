from django.contrib import admin

from .models import Document, DocumentTemplate, DocumentVersion


class VersionInline(admin.TabularInline):
    model = DocumentVersion
    extra = 0
    readonly_fields = ("number", "comment", "author_initials", "created_at", "file")


@admin.register(DocumentTemplate)
class DocumentTemplateAdmin(admin.ModelAdmin):
    list_display = ("name", "kind", "is_generic", "default_confidentiality")
    list_filter = ("kind", "is_generic")


@admin.register(Document)
class DocumentAdmin(admin.ModelAdmin):
    list_display = ("title", "template", "project", "confidentiality",
                    "current_version", "updated_at")
    list_filter = ("confidentiality", "template__kind")
    inlines = [VersionInline]


@admin.register(DocumentVersion)
class DocumentVersionAdmin(admin.ModelAdmin):
    list_display = ("document", "number", "author_initials", "created_at")
