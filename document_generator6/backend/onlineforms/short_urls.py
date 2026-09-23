from django.urls import path

from .views import resolve_short_link

urlpatterns = [
    path("<str:code>", resolve_short_link, name="resolve-short-link"),
]
