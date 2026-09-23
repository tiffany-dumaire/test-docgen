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

# --- Couleurs (thème du modèle) ---
COLORS = {
    "primary": "#1F497D",       # dk2 du thème
    "accent": "#4F81BD",        # accent1
    "heading": "#000000",       # titres 1-4
    "heading_deep": "#243F60",  # titres 5+
    "toc_heading": "#365F91",
    "muted": "#595959",
    "border": "#BFBFBF",
    "light": "#F2F2F2",
    "code_bg": "#F4F4F4",
    "link": "#0000FF",
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
