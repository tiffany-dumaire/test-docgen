from django.contrib import admin
from .models import CompanyProfile, UsefulLink


class UsefulLinkInline(admin.TabularInline):
    model = UsefulLink
    extra = 1


@admin.register(CompanyProfile)
class CompanyProfileAdmin(admin.ModelAdmin):
    list_display = ("name", "email", "phone", "website")
    inlines = [UsefulLinkInline]
