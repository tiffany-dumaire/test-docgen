"""Authentification par jeton JWT (OIDC / PKCE).

Deux modes, pilotés par les réglages :
  - DEV (AUTH_DEV=True) : jetons HS256 signés avec AUTH_DEV_SECRET, émis par
    l'endpoint /api/auth/dev-token/ (pour développer/tester sans IdP).
  - PROD : jetons RS256 vérifiés via le JWKS du fournisseur d'identité
    (OIDC_JWKS_URL), avec contrôle de l'audience et de l'émetteur.

Les claims (sub, email, given_name/family_name ou name, rôles) alimentent un
AppUser (get_or_create par 'sub'). Les rôles applicatifs proviennent d'un claim
configurable (AUTH_ROLES_CLAIM), avec prise en charge de 'realm_access.roles'
(Keycloak) et 'roles' (Entra ID/Azure AD).
"""
import time

from django.conf import settings
from django.utils import timezone
from rest_framework import authentication, exceptions

try:
    import jwt
    from jwt import PyJWKClient
except Exception:  # pragma: no cover
    jwt = None
    PyJWKClient = None

_jwk_client = None
_jwks_cache_ts = 0


def _get_jwk_client():
    global _jwk_client, _jwks_cache_ts
    url = getattr(settings, "OIDC_JWKS_URL", "")
    if not url or PyJWKClient is None:
        return None
    if _jwk_client is None or (time.time() - _jwks_cache_ts) > 3600:
        _jwk_client = PyJWKClient(url)
        _jwks_cache_ts = time.time()
    return _jwk_client


def _extract_roles(payload):
    claim = getattr(settings, "AUTH_ROLES_CLAIM", "roles")
    # chemin pointé (ex. realm_access.roles)
    node = payload
    for part in claim.split("."):
        if isinstance(node, dict) and part in node:
            node = node[part]
        else:
            node = None
            break
    roles = node
    if roles is None:  # replis courants
        roles = payload.get("roles") or (
            payload.get("realm_access", {}) or {}).get("roles") or []
    if isinstance(roles, str):
        roles = [r.strip() for r in roles.split(",") if r.strip()]
    return list(roles or [])


def _names(payload):
    first = payload.get("given_name", "")
    last = payload.get("family_name", "")
    if not first and not last and payload.get("name"):
        parts = payload["name"].split(" ", 1)
        first = parts[0]
        last = parts[1] if len(parts) > 1 else ""
    return first, last


class JWTAuthentication(authentication.BaseAuthentication):
    keyword = "Bearer"

    def authenticate(self, request):
        auth = authentication.get_authorization_header(request).split()
        if not auth or auth[0].lower() != self.keyword.lower().encode():
            return None
        if len(auth) != 2:
            raise exceptions.AuthenticationFailed("En-tête Authorization invalide.")
        token = auth[1].decode()
        payload = self._decode(token)
        user = self._get_or_create_user(payload)
        return (user, payload)

    def _decode(self, token):
        if jwt is None:
            raise exceptions.AuthenticationFailed("PyJWT non installé.")
        try:
            if getattr(settings, "AUTH_DEV", False):
                return jwt.decode(
                    token, settings.AUTH_DEV_SECRET, algorithms=["HS256"],
                    options={"verify_aud": False})
            client = _get_jwk_client()
            if client is None:
                raise exceptions.AuthenticationFailed("JWKS non configuré.")
            signing_key = client.get_signing_key_from_jwt(token).key
            return jwt.decode(
                token, signing_key,
                algorithms=["RS256", "ES256"],
                audience=getattr(settings, "OIDC_AUDIENCE", None) or None,
                issuer=getattr(settings, "OIDC_ISSUER", None) or None,
                options={"verify_aud": bool(getattr(settings, "OIDC_AUDIENCE", ""))})
        except exceptions.AuthenticationFailed:
            raise
        except Exception as exc:
            raise exceptions.AuthenticationFailed(f"Jeton invalide : {exc}")

    def _get_or_create_user(self, payload):
        from .models import AppUser
        sub = payload.get("sub") or payload.get("oid") or payload.get("email")
        if not sub:
            raise exceptions.AuthenticationFailed("Jeton sans identifiant (sub).")
        first, last = _names(payload)
        roles = _extract_roles(payload)
        user, _ = AppUser.objects.get_or_create(sub=str(sub))
        user.email = payload.get("email", user.email) or user.email
        if first:
            user.first_name = first
        if last:
            user.last_name = last
        if roles:
            user.app_roles = roles
        user.last_login = timezone.now()
        user.save()
        return user
