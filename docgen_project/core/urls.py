from django.urls import path
from . import views

urlpatterns = [
    path("company/", views.company_view, name="company"),
    path("api/company/", views.company_api, name="company_api"),
    path("api/company/logo/", views.company_logo_api, name="company_logo_api"),
]
