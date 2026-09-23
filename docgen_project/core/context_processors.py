from .models import CompanyProfile


def company_profile(request):
    """Rend le profil entreprise disponible dans tous les templates."""
    try:
        profile = CompanyProfile.get_solo()
    except Exception:
        profile = None
    return {"company": profile}
