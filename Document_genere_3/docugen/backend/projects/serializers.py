from rest_framework import serializers

from .models import Contact, Project


class ContactSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(read_only=True)
    initials = serializers.CharField(read_only=True)

    class Meta:
        model = Contact
        fields = [
            "id",
            "kind",
            "first_name",
            "last_name",
            "full_name",
            "initials",
            "role",
            "email",
            "phone",
        ]


class ProjectSerializer(serializers.ModelSerializer):
    contacts = ContactSerializer(many=True, required=False)
    client_logo_url = serializers.SerializerMethodField()
    document_count = serializers.SerializerMethodField()

    class Meta:
        model = Project
        fields = [
            "id",
            "name",
            "client_name",
            "client_logo",
            "client_logo_url",
            "description",
            "reference",
            "status",
            "contacts",
            "document_count",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_client_logo_url(self, obj):
        request = self.context.get("request")
        if obj.client_logo and hasattr(obj.client_logo, "url"):
            url = obj.client_logo.url
            return request.build_absolute_uri(url) if request else url
        return None

    def get_document_count(self, obj):
        return obj.documents.count() if hasattr(obj, "documents") else 0

    def create(self, validated_data):
        contacts = validated_data.pop("contacts", [])
        project = Project.objects.create(**validated_data)
        for contact in contacts:
            Contact.objects.create(project=project, **contact)
        return project

    def update(self, instance, validated_data):
        contacts = validated_data.pop("contacts", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if contacts is not None:
            instance.contacts.all().delete()
            for contact in contacts:
                Contact.objects.create(project=instance, **contact)
        return instance
