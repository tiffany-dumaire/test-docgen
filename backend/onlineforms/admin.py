from django.contrib import admin

from .models import FormSubmission, FormTemplate, OnlineForm, ShortLink


@admin.register(FormTemplate)
class FormTemplateAdmin(admin.ModelAdmin):
    list_display = ("name", "scope", "is_active", "updated_at")
    list_filter = ("scope", "is_active")
    search_fields = ("name", "description")


@admin.register(ShortLink)
class ShortLinkAdmin(admin.ModelAdmin):
    list_display = ("code", "target_url", "click_count", "created_at")
    search_fields = ("code",)


@admin.register(OnlineForm)
class OnlineFormAdmin(admin.ModelAdmin):
    list_display = ("title", "project", "is_open", "confidentiality",
                    "created_at")
    list_filter = ("is_open", "confidentiality")
    search_fields = ("title",)


@admin.register(FormSubmission)
class FormSubmissionAdmin(admin.ModelAdmin):
    list_display = ("form", "submitted_at", "respondent_ip")
    list_filter = ("form",)
