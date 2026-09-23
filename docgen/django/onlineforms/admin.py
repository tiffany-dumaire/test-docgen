from django.contrib import admin

from .models import FormSubmission, OnlineForm


@admin.register(OnlineForm)
class OnlineFormAdmin(admin.ModelAdmin):
    list_display = ("title", "code", "project", "is_open", "created_at")
    readonly_fields = ("code",)


@admin.register(FormSubmission)
class FormSubmissionAdmin(admin.ModelAdmin):
    list_display = ("form", "submitted_at")
