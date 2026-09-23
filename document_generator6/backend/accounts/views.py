import time

from django.conf import settings
from rest_framework import status, viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from .models import AppUser, ProjectMembership
from .serializers import AppUserSerializer, ProjectMembershipSerializer


@api_view(["GET"])
@permission_classes([AllowAny])
def auth_config(request):
    """Configuration publique pour le flux PKCE côté frontend."""
    return Response({
        "mode": "dev" if getattr(settings, "AUTH_DEV", False) else "oidc",
        "authority": getattr(settings, "OIDC_ISSUER", ""),
        "client_id": getattr(settings, "OIDC_CLIENT_ID", ""),
        "authorize_url": getattr(settings, "OIDC_AUTHORIZE_URL", ""),
        "token_url": getattr(settings, "OIDC_TOKEN_URL", ""),
        "end_session_url": getattr(settings, "OIDC_END_SESSION_URL", ""),
        "scopes": getattr(settings, "OIDC_SCOPES", "openid profile email"),
        "redirect_uri": getattr(settings, "OIDC_REDIRECT_URI", ""),
        "post_logout_redirect_uri": getattr(settings, "OIDC_POST_LOGOUT_REDIRECT_URI", ""),
    })


@api_view(["POST"])
@permission_classes([AllowAny])
def dev_token(request):
    """Émet un jeton HS256 de développement (uniquement si AUTH_DEV)."""
    if not getattr(settings, "AUTH_DEV", False):
        return Response({"detail": "Mode développement désactivé."},
                        status=status.HTTP_403_FORBIDDEN)
    import jwt
    d = request.data or {}
    email = d.get("email", "dev@docugen.local")
    payload = {
        "sub": d.get("sub", email),
        "email": email,
        "given_name": d.get("first_name", "Dev"),
        "family_name": d.get("last_name", "User"),
        "roles": d.get("roles", ["admin"]),
        "iat": int(time.time()),
        "exp": int(time.time()) + 60 * 60 * 12,
    }
    token = jwt.encode(payload, settings.AUTH_DEV_SECRET, algorithm="HS256")
    return Response({"access_token": token, "token_type": "Bearer", "expires_in": 43200})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def me(request):
    """Renvoie l'utilisateur courant (issu du jeton) et ses projets."""
    user = request.user
    data = AppUserSerializer(user).data
    data["memberships"] = ProjectMembershipSerializer(
        user.memberships.select_related("project").all(), many=True).data
    return Response(data)


class ProjectMembershipViewSet(viewsets.ModelViewSet):
    queryset = ProjectMembership.objects.select_related("user", "project").all()
    serializer_class = ProjectMembershipSerializer
    filterset_fields = ["project", "user"]
    permission_classes = [AllowAny]


class UserViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = AppUser.objects.all()
    serializer_class = AppUserSerializer
    search_fields = ["email", "first_name", "last_name"]
    permission_classes = [AllowAny]
