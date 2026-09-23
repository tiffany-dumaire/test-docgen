from django.urls import path
from . import views

urlpatterns = [
    path("", views.form_builder, name="form_builder"),
    path("<int:pk>/submissions/", views.form_submissions_view, name="form_submissions"),
    # API
    path("api/list/", views.forms_api, name="forms_api"),
    path("api/<int:pk>/", views.form_api, name="form_api"),
    path("api/<int:pk>/submissions/", views.submissions_api, name="submissions_api"),
]
