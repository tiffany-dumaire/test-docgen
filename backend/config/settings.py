"""
Configuration Django pour le projet DocuGen.
Génération de documents génériques et personnalisés à partir de projets.
"""
import os
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")


def env_bool(name, default=False):
    return os.getenv(name, str(default)).lower() in ("1", "true", "yes", "on")


def env_list(name, default=""):
    raw = os.getenv(name, default)
    return [item.strip() for item in raw.split(",") if item.strip()]


SECRET_KEY = os.getenv("SECRET_KEY", "dev-insecure-key-change-me")
DEBUG = env_bool("DEBUG", True)
ALLOWED_HOSTS = env_list("ALLOWED_HOSTS", "localhost,127.0.0.1")

PUBLIC_BASE_URL = os.getenv("PUBLIC_BASE_URL", "http://localhost:8000")
FRONTEND_BASE_URL = os.getenv("FRONTEND_BASE_URL", "http://localhost:4200")

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # Tiers
    "rest_framework",
    "corsheaders",
    "django_filters",
    # Applications locales
    "company",
    "projects",
    "documents",
    "onlineforms",
    "accounts",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

# ---------------------------------------------------------------------------
# Base de données
# ---------------------------------------------------------------------------
# PostgreSQL par défaut (voir backend/.env.example et le dev container).
# Il reste possible de repasser sur SQLite en positionnant
# DB_ENGINE=django.db.backends.sqlite3 (utile pour un test rapide hors Docker).
DB_ENGINE = os.getenv("DB_ENGINE", "django.db.backends.postgresql")

if DB_ENGINE.endswith("sqlite3"):
    DATABASES = {
        "default": {
            "ENGINE": DB_ENGINE,
            "NAME": os.getenv("DB_NAME", str(BASE_DIR / "db.sqlite3")),
        }
    }
else:
    DATABASES = {
        "default": {
            "ENGINE": DB_ENGINE,
            "NAME": os.getenv("DB_NAME", "docugen"),
            "USER": os.getenv("DB_USER", "docugen"),
            "PASSWORD": os.getenv("DB_PASSWORD", "docugen"),
            "HOST": os.getenv("DB_HOST", "localhost"),
            "PORT": os.getenv("DB_PORT", "5432"),
            "CONN_MAX_AGE": int(os.getenv("DB_CONN_MAX_AGE", "60")),
        }
    }

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = os.getenv("LANGUAGE_CODE", "fr-fr")
TIME_ZONE = os.getenv("TIME_ZONE", "Europe/Paris")
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"

MEDIA_URL = "media/"
MEDIA_ROOT = BASE_DIR / "media"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# ---------------------------------------------------------------------------
# Django REST Framework
# ---------------------------------------------------------------------------
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "accounts.authentication.JWTAuthentication",
    ],
    # Permissions ouvertes pour l'instant : le jeton est lu s'il est présent,
    # l'application des droits/rôles se fera dans une étape ultérieure.
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.AllowAny",
    ],
    "DEFAULT_FILTER_BACKENDS": [
        "django_filters.rest_framework.DjangoFilterBackend",
        "rest_framework.filters.SearchFilter",
        "rest_framework.filters.OrderingFilter",
    ],
    "DEFAULT_PAGINATION_CLASS": "config.pagination.DefaultPagination",
    "PAGE_SIZE": 25,
    "DEFAULT_RENDERER_CLASSES": [
        "rest_framework.renderers.JSONRenderer",
        "rest_framework.renderers.BrowsableAPIRenderer",
    ],
}

# ---------------------------------------------------------------------------
# CORS (interface Angular sur un autre port)
# ---------------------------------------------------------------------------
CORS_ALLOWED_ORIGINS = env_list(
    "CORS_ALLOWED_ORIGINS", "http://localhost:4200,http://127.0.0.1:4200"
)
CORS_ALLOW_CREDENTIALS = True

# ---------------------------------------------------------------------------
# Authentification (OIDC / PKCE + JWT)
# ---------------------------------------------------------------------------
# Mode développement : jetons HS256 émis localement (aucun IdP requis).
AUTH_DEV = env_bool("AUTH_DEV", True) if "env_bool" in dir() else \
    (os.environ.get("AUTH_DEV", "true").lower() == "true")
AUTH_DEV_SECRET = os.environ.get("AUTH_DEV_SECRET", SECRET_KEY)
AUTH_ROLES_CLAIM = os.environ.get("AUTH_ROLES_CLAIM", "roles")

# Fournisseur d'identité (production) — à renseigner via variables d'environnement.
OIDC_ISSUER = os.environ.get("OIDC_ISSUER", "")
OIDC_JWKS_URL = os.environ.get("OIDC_JWKS_URL", "")
OIDC_AUDIENCE = os.environ.get("OIDC_AUDIENCE", "")
OIDC_CLIENT_ID = os.environ.get("OIDC_CLIENT_ID", "")
OIDC_AUTHORIZE_URL = os.environ.get("OIDC_AUTHORIZE_URL", "")
OIDC_TOKEN_URL = os.environ.get("OIDC_TOKEN_URL", "")
OIDC_END_SESSION_URL = os.environ.get("OIDC_END_SESSION_URL", "")
OIDC_SCOPES = os.environ.get("OIDC_SCOPES", "openid profile email")
OIDC_REDIRECT_URI = os.environ.get("OIDC_REDIRECT_URI", "http://localhost:4200/auth/callback")
OIDC_POST_LOGOUT_REDIRECT_URI = os.environ.get("OIDC_POST_LOGOUT_REDIRECT_URI", "http://localhost:4200/")

# En développement, autoriser toutes les origines si aucune n'est définie
if DEBUG and not CORS_ALLOWED_ORIGINS:
    CORS_ALLOW_ALL_ORIGINS = True
