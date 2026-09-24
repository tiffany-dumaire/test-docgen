from rest_framework import serializers

from .models import (Client, Contact, JournalEntry, Meeting, Project,
                     ProjectAssignment, ProjectLink)


class ContactSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(read_only=True)
    initials = serializers.CharField(read_only=True)

    class Meta:
        model = Contact
        fields = ["id", "kind", "first_name", "last_name", "full_name",
                  "initials", "role", "email", "phone"]


class ClientSerializer(serializers.ModelSerializer):
    project_count = serializers.SerializerMethodField()

    class Meta:
        model = Client
        fields = ["id", "name", "contact_name", "email", "phone", "address",
                  "notes", "project_count", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_project_count(self, obj):
        return obj.projects.count()


class ProjectAssignmentSerializer(serializers.ModelSerializer):
    member_name = serializers.CharField(source="member.full_name", read_only=True)
    member_email = serializers.CharField(source="member.email", read_only=True)
    team_name = serializers.SerializerMethodField()

    class Meta:
        model = ProjectAssignment
        fields = ["id", "member", "member_name", "member_email", "team_name", "role"]
        read_only_fields = ["id", "member_name", "member_email", "team_name"]

    def get_team_name(self, obj):
        # Un collaborateur peut appartenir à plusieurs équipes.
        return ", ".join(t.name for t in obj.member.teams.all())


class MeetingSerializer(serializers.ModelSerializer):
    class Meta:
        model = Meeting
        fields = ["id", "project", "title", "date", "location", "notes",
                  "documents", "created_at"]
        read_only_fields = ["id", "created_at"]


class JournalEntrySerializer(serializers.ModelSerializer):
    class Meta:
        model = JournalEntry
        fields = ["id", "project", "meeting", "document_version", "category",
                  "confidentiality", "body", "author", "created_at"]
        read_only_fields = ["id", "created_at"]


class ProjectLinkSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProjectLink
        fields = ["id", "project", "category", "name", "url", "comment", "order"]
        read_only_fields = ["id"]


class ProjectSerializer(serializers.ModelSerializer):
    contacts = ContactSerializer(many=True, required=False)
    assignments = ProjectAssignmentSerializer(many=True, required=False)
    client_detail = ClientSerializer(source="client", read_only=True)
    clients_detail = ClientSerializer(source="clients", many=True, read_only=True)
    children = serializers.SerializerMethodField()
    links = ProjectLinkSerializer(many=True, read_only=True)
    client_logo_url = serializers.SerializerMethodField()
    document_count = serializers.SerializerMethodField()

    class Meta:
        model = Project
        fields = [
            "id", "name", "client_name", "client", "client_detail",
            "client_logo", "client_logo_url", "description", "reference",
            "status", "start_date", "end_date", "styles", "parent", "clients",
            "clients_detail", "children", "custom_field_defs", "custom_fields",
            "links", "contacts", "assignments",
            "document_count", "created_at", "updated_at",
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

    def get_children(self, obj):
        return [{"id": c.id, "name": c.name, "status": c.status}
                for c in obj.children.all()]

    def _sync_assignments(self, project, assignments):
        project.assignments.all().delete()
        for a in assignments:
            ProjectAssignment.objects.create(
                project=project, member=a["member"], role=a.get("role", ""))

    def create(self, validated_data):
        contacts = validated_data.pop("contacts", [])
        assignments = validated_data.pop("assignments", None)
        clients = validated_data.pop("clients", None)
        project = Project.objects.create(**validated_data)
        if clients is not None:
            project.clients.set(clients)
        for contact in contacts:
            Contact.objects.create(project=project, **contact)
        if assignments:
            self._sync_assignments(project, assignments)
        return project

    def update(self, instance, validated_data):
        contacts = validated_data.pop("contacts", None)
        assignments = validated_data.pop("assignments", None)
        clients = validated_data.pop("clients", None)
        if clients is not None:
            instance.clients.set(clients)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if contacts is not None:
            instance.contacts.all().delete()
            for contact in contacts:
                Contact.objects.create(project=instance, **contact)
        if assignments is not None:
            self._sync_assignments(instance, assignments)
        return instance
