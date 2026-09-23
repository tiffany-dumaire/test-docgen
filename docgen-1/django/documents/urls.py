from django.urls import path

from . import api, views

urlpatterns = [
    # Templates
    path("templates/", views.template_list, name="template_list"),
    path("templates/new/", views.template_edit, name="template_new"),
    path("templates/<int:pk>/edit/", views.template_edit, name="template_edit"),
    path("templates/<int:pk>/config/", views.template_config, name="template_config"),
    path("templates/<int:pk>/editor/", views.pdf_editor, name="pdf_editor"),
    path("templates/<int:pk>/editor/save/", views.pdf_editor_save, name="pdf_editor_save"),

    # Documents
    path("", views.document_list, name="document_list"),
    path("new/", views.document_edit, name="document_new"),
    path("<int:pk>/", views.document_detail, name="document_detail"),
    path("<int:pk>/edit/", views.document_edit, name="document_edit"),
    path("<int:pk>/regenerate/", views.document_regenerate, name="document_regenerate"),
    path("versions/<int:pk>/download/", views.version_download, name="version_download"),

    # External API (consumed by Bruno)
    path("api/templates/", api.api_templates, name="api_templates"),
    path("api/projects/", api.api_projects, name="api_projects"),
    path("api/generate/", api.api_generate, name="api_generate"),
    path("api/documents/<int:pk>/download/", api.api_document_download,
         name="api_document_download"),
]
