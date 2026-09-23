from django.urls import path

from . import views

urlpatterns = [
    path("", views.dashboard, name="dashboard"),
    path("projects/", views.project_list, name="project_list"),
    path("projects/new/", views.project_edit, name="project_new"),
    path("projects/<int:pk>/", views.project_detail, name="project_detail"),
    path("projects/<int:pk>/edit/", views.project_edit, name="project_edit"),
    path("contacts/", views.contact_list, name="contact_list"),
    path("company/", views.company_settings, name="company_settings"),
]
