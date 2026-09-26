import base64
import hashlib
import json
import secrets
import time
import urllib.parse
import urllib.request

from django.conf import settings
from django.core.cache import cache
from rest_framework import status, viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from .models import AppUser, ProjectMembership
from .serializers import AppUserSerializer, ProjectMembershipSerializer

# Durée de vie du code_verifier PKCE côté serveur (entre /login et /callback).
_PKCE_TTL = 600


def _b64url(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).decode().rstrip("=")


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
    # « token avec informations » : on renvoie aussi l'utilisateur résolu.
    from .authentication import JWTAuthentication
    user = JWTAuthentication()._get_or_create_user(payload)
    return Response({
        "access_token": token, "token_type": "Bearer", "expires_in": 43200,
        "user": AppUserSerializer(user).data,
    })


@api_view(["POST", "GET"])
@permission_classes([AllowAny])
def pkce_start(request):
    """Démarre un flux Authorization Code + PKCE orchestré par Django.

    Le `code_verifier` est généré et conservé côté serveur (indexé par `state`) ;
    le frontend ne reçoit que l'URL d'autorisation et le `state`, puis est
    redirigé vers le fournisseur d'identité.
    """
    if getattr(settings, "AUTH_DEV", False):
        return Response({"detail": "Mode développement : utilisez /auth/dev-token/."},
                        status=status.HTTP_400_BAD_REQUEST)
    authorize_url = getattr(settings, "OIDC_AUTHORIZE_URL", "")
    if not authorize_url:
        return Response({"detail": "OIDC non configuré."},
                        status=status.HTTP_400_BAD_REQUEST)
    verifier = _b64url(secrets.token_bytes(48))
    challenge = _b64url(hashlib.sha256(verifier.encode()).digest())
    state = _b64url(secrets.token_bytes(16))
    cache.set(f"pkce:{state}", verifier, _PKCE_TTL)
    params = {
        "response_type": "code",
        "client_id": getattr(settings, "OIDC_CLIENT_ID", ""),
        "redirect_uri": getattr(settings, "OIDC_REDIRECT_URI", ""),
        "scope": getattr(settings, "OIDC_SCOPES", "openid profile email"),
        "code_challenge": challenge,
        "code_challenge_method": "S256",
        "state": state,
    }
    return Response({
        "authorize_url": f"{authorize_url}?{urllib.parse.urlencode(params)}",
        "state": state,
    })


@api_view(["POST"])
@permission_classes([AllowAny])
def pkce_callback(request):
    """Termine le flux PKCE : échange le `code` contre un jeton côté serveur.

    L'échange (avec le `code_verifier` conservé et, si présent, le secret client)
    est fait par Django, puis le jeton est validé et l'utilisateur résolu.
    Retourne le jeton d'accès et les informations utilisateur.
    """
    if getattr(settings, "AUTH_DEV", False):
        return Response({"detail": "Mode développement : utilisez /auth/dev-token/."},
                        status=status.HTTP_400_BAD_REQUEST)
    d = request.data or {}
    code = d.get("code")
    state = d.get("state", "")
    if not code:
        return Response({"detail": "Paramètre 'code' manquant."},
                        status=status.HTTP_400_BAD_REQUEST)
    verifier = cache.get(f"pkce:{state}") if state else None
    if state and verifier is None:
        return Response({"detail": "État PKCE inconnu ou expiré."},
                        status=status.HTTP_400_BAD_REQUEST)
    token_url = getattr(settings, "OIDC_TOKEN_URL", "")
    if not token_url:
        return Response({"detail": "OIDC_TOKEN_URL non configuré."},
                        status=status.HTTP_400_BAD_REQUEST)
    form = {
        "grant_type": "authorization_code",
        "code": code,
        "redirect_uri": getattr(settings, "OIDC_REDIRECT_URI", ""),
        "client_id": getattr(settings, "OIDC_CLIENT_ID", ""),
    }
    if verifier:
        form["code_verifier"] = verifier
    if getattr(settings, "OIDC_CLIENT_SECRET", ""):
        form["client_secret"] = settings.OIDC_CLIENT_SECRET
    try:
        req = urllib.request.Request(
            token_url, data=urllib.parse.urlencode(form).encode(),
            headers={"Content-Type": "application/x-www-form-urlencoded",
                     "Accept": "application/json"})
        with urllib.request.urlopen(req, timeout=15) as resp:
            payload = json.loads(resp.read().decode())
    except Exception as exc:  # pragma: no cover - dépend de l'IdP
        return Response({"detail": f"Échec de l'échange du code : {exc}"},
                        status=status.HTTP_502_BAD_GATEWAY)
    finally:
        if state:
            cache.delete(f"pkce:{state}")

    access_token = payload.get("access_token")
    if not access_token:
        return Response({"detail": "Aucun access_token reçu du fournisseur."},
                        status=status.HTTP_502_BAD_GATEWAY)

    # Valide le jeton et résout l'utilisateur (token « avec informations »).
    from .authentication import JWTAuthentication
    auth = JWTAuthentication()
    user_data = None
    try:
        claims = auth._decode(access_token)
        user = auth._get_or_create_user(claims)
        user_data = AppUserSerializer(user).data
    except Exception:
        user_data = None  # jeton opaque : /auth/me/ prendra le relais
    return Response({
        "access_token": access_token,
        "token_type": payload.get("token_type", "Bearer"),
        "expires_in": payload.get("expires_in"),
        "id_token": payload.get("id_token"),
        "user": user_data,
    })


@api_view(["PATCH", "PUT"])
@permission_classes([IsAuthenticated])
def update_prefs(request):
    """Met à jour les préférences d'interface de l'utilisateur courant."""
    user = request.user
    prefs = dict(user.ui_prefs or {})
    prefs.update(request.data or {})
    user.ui_prefs = prefs
    user.save(update_fields=["ui_prefs", "updated_at"])
    return Response(AppUserSerializer(user).data)


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
