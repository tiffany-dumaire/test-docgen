from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

from core import views as core_views
from forms_app import views as forms_views

urlpatterns = [
    path("admin/", admin.site.urls),

    # Tableau de bord
    path("", core_views.dashboard, name="dashboard"),

    # Apps
    path("", include("core.urls")),
    path("projects/", include("projects.urls")),
    path("documents/", include("documents.urls")),
    path("forms/", include("forms_app.urls")),

    # Liens réduits publics : /f/<code>/
    path("f/<str:short_code>/", forms_views.public_form, name="public_form"),
    path("f/<str:short_code>/submit/", forms_views.submit_form, name="submit_form"),
    path("f/<str:short_code>/qr/", forms_views.qr_code, name="form_qr"),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.BASE_DIR / "static")
