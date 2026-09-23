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
