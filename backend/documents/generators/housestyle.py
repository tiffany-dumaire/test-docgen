"""
Charte graphique extraite de « Modèle.docx ».

Centralise les polices, couleurs, tailles et la structure (page de garde,
page de suivi, table des matières, contenu) afin que les rendus Word ET PDF
respectent le même modèle.
"""
import os

ASSETS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "assets")
FONTS_DIR = os.path.join(ASSETS_DIR, "fonts")
BASE_DOCX = os.path.join(ASSETS_DIR, "Modele.docx")

# --- Couleurs (charte VNV / Corporate Identity par défaut) ---
# Orange VNV #ec6608, charcoal #1d1e1b, gris 45% #a8a8a8.
COLORS = {
    "primary": "#EC6608",       # Orange VNV
    "accent": "#F5A15A",        # Orange VNV éclairci
    "heading": "#1D1E1B",       # Charcoal Black (titres 1-4)
    "heading_deep": "#3A3A36",  # titres 5+
    "toc_heading": "#EC6608",
    "muted": "#6D6D6A",
    "border": "#CBC7BC",
    "light": "#F5F3EF",
    "code_bg": "#F4F4F2",
    "link": "#EC6608",
}

# --- Polices (fichiers TTF embarqués) ---
FONT_FILES = {
    "Montserrat-SemiBold": "Montserrat-SemiBold.ttf",
    "Montserrat": "Montserrat-Regular.ttf",
    "Montserrat-Medium": "Montserrat-Medium.ttf",
    "Montserrat-Light": "Montserrat-Light.ttf",
    "Roboto": "Roboto-Regular.ttf",
    "Roboto-Bold": "Roboto-Bold.ttf",
}

# --- Profil typographique : (police, taille pt, couleur) ---
TITLE = ("Montserrat-SemiBold", 26, COLORS["heading"])
SUBTITLE = ("Montserrat", 16, COLORS["muted"])
SECTION = ("Montserrat-SemiBold", 22, COLORS["heading"])  # Titre 1 sans numéro
BODY = ("Roboto", 9.5, COLORS["heading"])
HEADINGS = {
    1: ("Montserrat-SemiBold", 22, COLORS["heading"]),
    2: ("Montserrat-SemiBold", 17, COLORS["heading"]),
    3: ("Montserrat", 13, COLORS["heading"]),
    4: ("Montserrat-Light", 11, COLORS["heading"]),
    5: ("Montserrat", 11, COLORS["heading_deep"]),
}
CODE_FONT = "Roboto"  # remplacé par Courier côté PDF

# --- Correspondance des styles dans Modele.docx (par styleId) ---
DOCX_STYLE_IDS = {
    "title": "VNV-DONTUSE-T",
    "subtitle": "VNV-DONTUSE-ST",
    "section": "VNV-Heading1sansnumro",
    "h1": "Titre1",
    "h2": "Titre2",
    "h3": "Titre3",
    "h4": "Titre4",
    "h5": "Titre5",
    "normal": "Normal",
}

# --- Marges (twips) issues du modèle ---
MARGINS_TWIPS = {"top": 2552, "right": 1134, "bottom": 1134, "left": 1134}

_pdf_fonts_registered = False


def register_pdf_fonts():
    """Enregistre les polices du modèle pour reportlab (idempotent)."""
    global _pdf_fonts_registered
    if _pdf_fonts_registered:
        return
    from reportlab.pdfbase import pdfmetrics
    from reportlab.pdfbase.pdfmetrics import registerFontFamily
    from reportlab.pdfbase.ttfonts import TTFont

    for name, filename in FONT_FILES.items():
        path = os.path.join(FONTS_DIR, filename)
        if os.path.exists(path):
            try:
                pdfmetrics.registerFont(TTFont(name, path))
            except Exception:
                pass
    # Famille Roboto (gras géré)
    try:
        registerFontFamily("Roboto", normal="Roboto", bold="Roboto-Bold",
                           italic="Roboto", boldItalic="Roboto-Bold")
    except Exception:
        pass
    _pdf_fonts_registered = True


def font_available(name: str) -> bool:
    return os.path.exists(os.path.join(FONTS_DIR, FONT_FILES.get(name, "")))
