from django.urls import path
from . import views

urlpatterns = [
    path("", views.document_studio, name="document_studio"),
    path("<int:pk>/view/", views.document_detail, name="document_detail"),
    path("<int:pk>/download/", views.document_download, name="document_download"),
    path("<int:pk>/versions/<int:version_number>/download/", views.version_download, name="version_download"),
    # API
    path("api/meta/", views.meta_api, name="meta_api"),
    path("api/list/", views.documents_api, name="documents_api"),
    path("api/<int:pk>/", views.document_api, name="document_api"),
]
