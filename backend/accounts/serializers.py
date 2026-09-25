from rest_framework import serializers

from .models import AppUser, ProjectMembership


class AppUserSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(read_only=True)
    primary_app_role = serializers.CharField(read_only=True)

    class Meta:
        model = AppUser
        fields = ["id", "sub", "email", "first_name", "last_name", "full_name",
                  "app_roles", "primary_app_role", "ui_prefs", "is_active", "last_login"]
        read_only_fields = fields


class ProjectMembershipSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source="user.full_name", read_only=True)
    user_email = serializers.CharField(source="user.email", read_only=True)

    class Meta:
        model = ProjectMembership
        fields = ["id", "user", "user_name", "user_email", "project", "roles"]
        read_only_fields = ["id", "user_name", "user_email"]
