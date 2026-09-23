from django.urls import path
from . import views

urlpatterns = [
    path("", views.project_list, name="project_list"),
    path("<int:pk>/", views.project_detail, name="project_detail"),
    # API
    path("api/list/", views.projects_api, name="projects_api"),
    path("api/<int:pk>/", views.project_api, name="project_api"),
    path("api/<int:pk>/logo/", views.project_logo_api, name="project_logo_api"),
    path("api/contacts/", views.contacts_api, name="contacts_api"),
]
