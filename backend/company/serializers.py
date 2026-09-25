from rest_framework import serializers

from .models import CompanyProfile, UsefulLink


def _member_qs():
    from .models import TeamMember
    return TeamMember.objects.all()


def _team_qs():
    from .models import Team
    return Team.objects.all()


def _project_qs():
    from projects.models import Project
    return Project.objects.all()


class UsefulLinkSerializer(serializers.ModelSerializer):
    class Meta:
        model = UsefulLink
        fields = ["id", "category", "label", "url", "order"]


class CompanyProfileSerializer(serializers.ModelSerializer):
    useful_links = UsefulLinkSerializer(many=True, required=False)
    logo_url = serializers.SerializerMethodField()

    class Meta:
        model = CompanyProfile
        fields = [
            "id",
            "name",
            "logo",
            "logo_url",
            "description",
            "website_url",
            "terms_url",
            "address",
            "phone",
            "email",
            "useful_links",
            "styles",
            "updated_at",
        ]
        read_only_fields = ["id", "updated_at"]

    def get_logo_url(self, obj):
        request = self.context.get("request")
        if obj.logo and hasattr(obj.logo, "url"):
            url = obj.logo.url
            return request.build_absolute_uri(url) if request else url
        return None

    def update(self, instance, validated_data):
        links_data = validated_data.pop("useful_links", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if links_data is not None:
            instance.useful_links.all().delete()
            for link in links_data:
                UsefulLink.objects.create(company=instance, **link)
        return instance


class TeamMemberSerializer(serializers.ModelSerializer):
    """Collaborateur de l'entreprise (peut appartenir à plusieurs équipes)."""
    full_name = serializers.CharField(read_only=True)
    initials = serializers.CharField(read_only=True)
    team_ids = serializers.PrimaryKeyRelatedField(
        source="teams", many=True, read_only=True)
    team_names = serializers.SerializerMethodField()

    class Meta:
        from .models import TeamMember
        model = TeamMember
        fields = ["id", "first_name", "last_name", "full_name", "initials",
                  "role", "email", "phone", "team_ids", "team_names"]
        read_only_fields = ["id", "full_name", "initials", "team_ids",
                            "team_names"]

    def get_team_names(self, obj):
        return [t.name for t in obj.teams.all()]

    def create(self, validated_data):
        from .models import CompanyProfile
        validated_data["company"] = CompanyProfile.load()
        return super().create(validated_data)


class TeamMemberMiniSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(read_only=True)
    initials = serializers.CharField(read_only=True)

    class Meta:
        from .models import TeamMember
        model = TeamMember
        fields = ["id", "first_name", "last_name", "full_name", "initials",
                  "role", "email"]


class TeamSerializer(serializers.ModelSerializer):
    members = TeamMemberMiniSerializer(many=True, read_only=True)
    member_ids = serializers.PrimaryKeyRelatedField(
        source="members", many=True, required=False,
        queryset=_member_qs(), write_only=True)
    related_team_ids = serializers.PrimaryKeyRelatedField(
        source="related_teams", many=True, required=False,
        queryset=_team_qs())
    project_ids = serializers.PrimaryKeyRelatedField(
        source="projects", many=True, required=False,
        queryset=_project_qs(), write_only=True)
    projects_detail = serializers.SerializerMethodField()
    subteam_ids = serializers.PrimaryKeyRelatedField(
        source="subteams", many=True, read_only=True)
    parent_name = serializers.CharField(source="parent.name", read_only=True,
                                        default=None)
    member_count = serializers.SerializerMethodField()
    project_count = serializers.SerializerMethodField()

    class Meta:
        from .models import Team
        model = Team
        fields = ["id", "name", "description", "color", "parent", "parent_name",
                  "subteam_ids", "related_teams", "related_team_ids",
                  "members", "member_ids", "projects_detail", "project_ids",
                  "member_count", "project_count", "created_at"]
        read_only_fields = ["id", "parent_name", "subteam_ids", "related_teams",
                            "members", "projects_detail", "member_count",
                            "project_count", "created_at"]

    def get_member_count(self, obj):
        return obj.members.count()

    def get_project_count(self, obj):
        return obj.projects.count()

    def get_projects_detail(self, obj):
        return [{"id": p.id, "name": p.name, "status": p.status,
                 "client_name": p.client_name}
                for p in obj.projects.all()]

    def create(self, validated_data):
        from .models import CompanyProfile
        members = validated_data.pop("members", None)
        related = validated_data.pop("related_teams", None)
        projects = validated_data.pop("projects", None)
        team = super().create({**validated_data,
                               "company": CompanyProfile.load()})
        if members is not None:
            team.members.set(members)
        if related is not None:
            team.related_teams.set(related)
        if projects is not None:
            team.projects.set(projects)
        return team

    def update(self, instance, validated_data):
        members = validated_data.pop("members", None)
        related = validated_data.pop("related_teams", None)
        projects = validated_data.pop("projects", None)
        instance = super().update(instance, validated_data)
        if members is not None:
            instance.members.set(members)
        if related is not None:
            instance.related_teams.set(related)
        if projects is not None:
            instance.projects.set(projects)
        return instance
