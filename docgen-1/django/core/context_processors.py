from .models import Company


def company(request):
    try:
        return {"company": Company.get_solo()}
    except Exception:
        return {"company": None}
