from rest_framework import serializers

from .models import CompanyProfile, UsefulLink


class UsefulLinkSerializer(serializers.ModelSerializer):
    class Meta:
        model = UsefulLink
        fields = ["id", "label", "url", "order"]


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
    full_name = serializers.CharField(read_only=True)

    class Meta:
        from .models import TeamMember
        model = TeamMember
        fields = ["id", "team", "first_name", "last_name", "full_name",
                  "role", "email", "phone"]
        read_only_fields = ["id", "full_name"]


class TeamSerializer(serializers.ModelSerializer):
    members = TeamMemberSerializer(many=True, required=False)
    member_count = serializers.SerializerMethodField()

    class Meta:
        from .models import Team
        model = Team
        fields = ["id", "name", "description", "members", "member_count",
                  "created_at"]
        read_only_fields = ["id", "created_at"]

    def get_member_count(self, obj):
        return obj.members.count()

    def create(self, validated_data):
        from .models import CompanyProfile, Team, TeamMember
        members = validated_data.pop("members", [])
        team = Team.objects.create(company=CompanyProfile.load(), **validated_data)
        for m in members:
            TeamMember.objects.create(team=team, **m)
        return team

    def update(self, instance, validated_data):
        from .models import TeamMember
        members = validated_data.pop("members", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if members is not None:
            instance.members.all().delete()
            for m in members:
                TeamMember.objects.create(team=instance, **m)
        return instance
