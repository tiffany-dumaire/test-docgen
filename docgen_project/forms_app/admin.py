from django.contrib import admin
from .models import OnlineForm, FormSubmission


class FormSubmissionInline(admin.TabularInline):
    model = FormSubmission
    extra = 0
    readonly_fields = ("data", "submitted_at", "ip_address")
    can_delete = False


@admin.register(OnlineForm)
class OnlineFormAdmin(admin.ModelAdmin):
    list_display = ("title", "project", "short_code", "is_active", "submissions_count", "created_at")
    list_filter = ("is_active", "confidentiality")
    readonly_fields = ("short_code",)
    inlines = [FormSubmissionInline]


@admin.register(FormSubmission)
class FormSubmissionAdmin(admin.ModelAdmin):
    list_display = ("form", "submitted_at", "ip_address")
    list_filter = ("form",)
