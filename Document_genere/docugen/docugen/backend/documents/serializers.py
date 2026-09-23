from rest_framework import serializers

from .models import (ConfidentialityLevel, Document, DocumentTemplate,
                     DocumentType, DocumentVersion)


class DocumentTemplateSerializer(serializers.ModelSerializer):
    doc_type_display = serializers.CharField(
        source="get_doc_type_display", read_only=True)

    class Meta:
        model = DocumentTemplate
        fields = [
            "id", "name", "slug", "description", "doc_type", "doc_type_display",
            "builder_key", "schema", "is_active", "is_system",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "is_system", "created_at", "updated_at"]


class DocumentVersionSerializer(serializers.ModelSerializer):
    file_url = serializers.SerializerMethodField()
    confidentiality_display = serializers.CharField(
        source="get_confidentiality_display", read_only=True)

    class Meta:
        model = DocumentVersion
        fields = [
            "id", "version_number", "comment", "author_initials",
            "author_name", "confidentiality", "confidentiality_display",
            "file", "file_url", "created_at",
        ]
        read_only_fields = fields

    def get_file_url(self, obj):
        request = self.context.get("request")
        if obj.file and hasattr(obj.file, "url"):
            return (request.build_absolute_uri(obj.file.url)
                    if request else obj.file.url)
        return None


class DocumentSerializer(serializers.ModelSerializer):
    versions = DocumentVersionSerializer(many=True, read_only=True)
    template_name = serializers.CharField(source="template.name", read_only=True)
    doc_type = serializers.CharField(source="template.doc_type", read_only=True)
    confidentiality_display = serializers.CharField(
        source="get_confidentiality_display", read_only=True)
    project_name = serializers.CharField(source="project.name", read_only=True)

    class Meta:
        model = Document
        fields = [
            "id", "project", "project_name", "template", "template_name",
            "doc_type", "title", "confidentiality", "confidentiality_display",
            "data", "current_version", "versions", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "current_version", "created_at", "updated_at"]


class GenerateSerializer(serializers.Serializer):
    """Payload pour déclencher une (re)génération."""
    author_initials = serializers.CharField(max_length=10)
    author_name = serializers.CharField(max_length=150, required=False,
                                        allow_blank=True, default="")
    comment = serializers.CharField(required=False, allow_blank=True, default="")
    confidentiality = serializers.ChoiceField(
        choices=ConfidentialityLevel.choices, required=False)
    data = serializers.JSONField(required=False)


class ChoicesSerializer(serializers.Serializer):
    """Expose les listes de choix pour l'UI."""
    confidentiality_levels = serializers.SerializerMethodField()
    document_types = serializers.SerializerMethodField()

    def get_confidentiality_levels(self, _):
        return [{"value": v, "label": l}
                for v, l in ConfidentialityLevel.choices]

    def get_document_types(self, _):
        return [{"value": v, "label": l} for v, l in DocumentType.choices]
