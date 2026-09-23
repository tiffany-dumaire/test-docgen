from django.urls import path

from . import views

urlpatterns = [
    path("forms/", views.form_list, name="form_list"),
    path("forms/new/", views.form_edit, name="form_new"),
    path("forms/<int:pk>/", views.form_detail, name="form_detail"),
    path("forms/<int:pk>/edit/", views.form_edit, name="form_edit"),
    path("forms/<int:pk>/qr.png", views.form_qr, name="form_qr"),
    # Public short link
    path("f/<str:code>/", views.public_form, name="public_form"),
]
