"""Pagination par défaut : taille 25, surchargeable via ?page_size= (max 1000)."""
from rest_framework.pagination import PageNumberPagination


class DefaultPagination(PageNumberPagination):
    page_size = 25
    page_size_query_param = "page_size"
    max_page_size = 1000
