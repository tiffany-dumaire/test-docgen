from django.conf import settings
from rest_framework import serializers

from .models import FormSubmission, OnlineForm, ShortLink


class ShortLinkSerializer(serializers.ModelSerializer):
    short_url = serializers.SerializerMethodField()

    class Meta:
        model = ShortLink
        fields = ["id", "code", "target_url", "click_count", "short_url",
                  "created_at"]
        read_only_fields = ["id", "code", "click_count", "created_at"]

    def get_short_url(self, obj):
        return f"{settings.PUBLIC_BASE_URL}/s/{obj.code}"


class OnlineFormSerializer(serializers.ModelSerializer):
    short_link = ShortLinkSerializer(read_only=True)
    short_url = serializers.SerializerMethodField()
    submission_count = serializers.SerializerMethodField()
    confidentiality_display = serializers.CharField(
        source="get_confidentiality_display", read_only=True)

    class Meta:
        model = OnlineForm
        fields = [
            "id", "title", "description", "project", "schema",
            "confidentiality", "confidentiality_display", "is_open",
            "success_message", "short_link", "short_url", "submission_count",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "short_link", "created_at", "updated_at"]

    def get_short_url(self, obj):
        if obj.short_link:
            return f"{settings.PUBLIC_BASE_URL}/s/{obj.short_link.code}"
        return None

    def get_submission_count(self, obj):
        return obj.submissions.count()

    def create(self, validated_data):
        form = OnlineForm.objects.create(**validated_data)
        form.ensure_short_link()
        return form


class PublicFormSerializer(serializers.ModelSerializer):
    """Vue publique : n'expose que ce qui est nécessaire au remplissage."""

    class Meta:
        model = OnlineForm
        fields = ["title", "description", "schema", "is_open",
                  "success_message"]


class FormSubmissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = FormSubmission
        fields = ["id", "form", "data", "submitted_at", "respondent_ip"]
        read_only_fields = ["id", "submitted_at", "respondent_ip"]
