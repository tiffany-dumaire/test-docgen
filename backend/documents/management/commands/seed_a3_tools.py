"""
Génère 8 outils d'analyse au format Template A3 (mise en page libre, facilement
modifiable), avec en-tête commun : logo entreprise, nom de l'outil, date, projet.

Outils : Business Model Canvas, Value Proposition Canvas, Empathy Map, Persona,
Customer Journey Map (paysage), Problem Statement (portrait, plusieurs/page),
PESTEL (paysage), Onion diagram.

Chaque modèle est un DocumentTemplate doc_type='a3' dont settings.a3_pages
contient la planche. Export possible en PDF / PNG / SVG.
"""
from django.core.management.base import BaseCommand

A3L = (1190.5512, 841.8898)   # A3 paysage (pt)
A3P = (841.8898, 1190.5512)   # A3 portrait (pt)
HEADER_H = 82

# Palette (fond clair, titre foncé)
C = {
    "blue": ("#DBEAFE", "#1E40AF"), "sky": ("#E0F2FE", "#0369A1"),
    "violet": ("#EDE9FE", "#6D28D9"), "green": ("#DCFCE7", "#15803D"),
    "amber": ("#FEF3C7", "#B45309"), "pink": ("#FCE7F3", "#BE185D"),
    "cyan": ("#CFFAFE", "#0E7490"), "red": ("#FEE2E2", "#B91C1C"),
    "slate": ("#F1F5F9", "#334155"), "teal": ("#CCFBF1", "#0F766E"),
}


# ---------------------------------------------------------------------------
# Traductions des libellés (fr = source). Ordre des valeurs : (en, de, it).
# Toute chaîne absente du dictionnaire est laissée telle quelle (variables, noms).
# ---------------------------------------------------------------------------
_TR_ROWS = {
    # En-tête
    "Date : {{today}}": ("Date: {{today}}", "Datum: {{today}}", "Data: {{today}}"),
    "Projet : {{project_name}}": ("Project: {{project_name}}", "Projekt: {{project_name}}", "Progetto: {{project_name}}"),
    "Réf. : {{project_reference}}": ("Ref.: {{project_reference}}", "Ref.: {{project_reference}}", "Rif.: {{project_reference}}"),
    # Business Model Canvas
    "Partenaires clés": ("Key Partners", "Schlüsselpartner", "Partner chiave"),
    "Activités clés": ("Key Activities", "Schlüsselaktivitäten", "Attività chiave"),
    "Ressources clés": ("Key Resources", "Schlüsselressourcen", "Risorse chiave"),
    "Proposition de valeur": ("Value Proposition", "Wertversprechen", "Proposta di valore"),
    "Relations clients": ("Customer Relationships", "Kundenbeziehungen", "Relazioni con i clienti"),
    "Canaux": ("Channels", "Kanäle", "Canali"),
    "Segments de clientèle": ("Customer Segments", "Kundensegmente", "Segmenti di clientela"),
    "Structure de coûts": ("Cost Structure", "Kostenstruktur", "Struttura dei costi"),
    "Flux de revenus": ("Revenue Streams", "Einnahmequellen", "Flussi di ricavi"),
    # Value Proposition Canvas
    "Produits & services": ("Products & Services", "Produkte & Dienstleistungen", "Prodotti e servizi"),
    "Créateurs de gains": ("Gain Creators", "Nutzenstifter", "Generatori di vantaggi"),
    "Solutions à la douleur": ("Pain Relievers", "Problemlöser", "Riduttori di sofferenze"),
    "Profil du client": ("Customer Profile", "Kundenprofil", "Profilo del cliente"),
    "Tâches du client": ("Customer Jobs", "Kundenaufgaben", "Attività del cliente"),
    "Gains attendus": ("Gains", "Gewinne", "Vantaggi"),
    "Douleurs / freins": ("Pains", "Probleme", "Sofferenze"),
    # Empathy Map
    "Pense & ressent": ("Thinks & Feels", "Denkt & fühlt", "Pensa e prova"),
    "Voit": ("Sees", "Sieht", "Vede"),
    "Entend": ("Hears", "Hört", "Sente"),
    "Dit & fait": ("Says & Does", "Sagt & tut", "Dice e fa"),
    "Utilisateur / persona": ("User / persona", "Nutzer / Persona", "Utente / persona"),
    "Douleurs / peurs / freins": ("Pains / fears / barriers", "Probleme / Ängste / Hürden", "Sofferenze / paure / freni"),
    "Gains / besoins / objectifs": ("Gains / needs / goals", "Gewinne / Bedürfnisse / Ziele", "Vantaggi / bisogni / obiettivi"),
    # Persona
    "Prénom NOM": ("First LAST", "Vorname NAME", "Nome COGNOME"),
    "Rôle / fonction": ("Role / position", "Rolle / Funktion", "Ruolo / funzione"),
    "Âge :": ("Age:", "Alter:", "Età:"),
    "Localisation :": ("Location:", "Standort:", "Località:"),
    "Métier :": ("Occupation:", "Beruf:", "Professione:"),
    "Situation :": ("Status:", "Situation:", "Situazione:"),
    "Niveau technique :": ("Tech level:", "Technik-Niveau:", "Livello tecnico:"),
    "Objectifs": ("Goals", "Ziele", "Obiettivi"),
    "Frustrations": ("Frustrations", "Frustrationen", "Frustrazioni"),
    "Motivations": ("Motivations", "Motivationen", "Motivazioni"),
    "Canaux préférés": ("Preferred channels", "Bevorzugte Kanäle", "Canali preferiti"),
    "Bio / contexte": ("Bio / context", "Bio / Kontext", "Bio / contesto"),
    "Citation": ("Quote", "Zitat", "Citazione"),
    # Customer Journey Map
    "Actions": ("Actions", "Aktionen", "Azioni"),
    "Points de contact": ("Touchpoints", "Kontaktpunkte", "Punti di contatto"),
    "Pensées": ("Thoughts", "Gedanken", "Pensieri"),
    "Émotions": ("Emotions", "Emotionen", "Emozioni"),
    "Douleurs": ("Pains", "Probleme", "Sofferenze"),
    "Opportunités": ("Opportunities", "Chancen", "Opportunità"),
    "Étapes": ("Stages", "Phasen", "Fasi"),
    "Découverte": ("Discovery", "Entdeckung", "Scoperta"),
    "Considération": ("Consideration", "Erwägung", "Considerazione"),
    "Décision / achat": ("Decision / purchase", "Entscheidung / Kauf", "Decisione / acquisto"),
    "Utilisation": ("Usage", "Nutzung", "Utilizzo"),
    "Fidélisation": ("Loyalty", "Bindung", "Fidelizzazione"),
    # Problem Statement
    "Problème observé :": ("Observed problem:", "Beobachtetes Problem:", "Problema osservato:"),
    "Personnes concernées :": ("People affected:", "Betroffene Personen:", "Persone coinvolte:"),
    "Contexte / quand :": ("Context / when:", "Kontext / wann:", "Contesto / quando:"),
    "Impact / conséquence :": ("Impact / consequence:", "Auswirkung / Folge:", "Impatto / conseguenza:"),
    "Hypothèse de solution :": ("Solution hypothesis:", "Lösungshypothese:", "Ipotesi di soluzione:"),
    "Énoncé du problème #1": ("Problem statement #1", "Problemstellung #1", "Enunciato del problema #1"),
    "Énoncé du problème #2": ("Problem statement #2", "Problemstellung #2", "Enunciato del problema #2"),
    "Énoncé du problème #3": ("Problem statement #3", "Problemstellung #3", "Enunciato del problema #3"),
    # PESTEL
    "Politique": ("Political", "Politisch", "Politico"),
    "Économique": ("Economic", "Wirtschaftlich", "Economico"),
    "Socioculturel": ("Sociocultural", "Soziokulturell", "Socioculturale"),
    "Technologique": ("Technological", "Technologisch", "Tecnologico"),
    "Environnemental": ("Environmental", "Ökologisch", "Ambientale"),
    "Légal": ("Legal", "Rechtlich", "Legale"),
    # Onion diagram
    "Environnement / marché": ("Environment / market", "Umfeld / Markt", "Ambiente / mercato"),
    "Organisation & partenaires": ("Organization & partners", "Organisation & Partner", "Organizzazione e partner"),
    "Parties prenantes directes": ("Direct stakeholders", "Direkte Stakeholder", "Parti interessate dirette"),
    "Cœur : produit / valeur": ("Core: product / value", "Kern: Produkt / Wert", "Nucleo: prodotto / valore"),
    "Diagramme en oignon — parties prenantes": (
        "Onion diagram — stakeholders", "Zwiebeldiagramm — Stakeholder",
        "Diagramma a cipolla — parti interessate"),
}
_LANG_IDX = {"en": 0, "de": 1, "it": 2}
TR = {lang: {fr: vals[i] for fr, vals in _TR_ROWS.items()}
      for lang, i in _LANG_IDX.items()}


def _t(lang, s):
    """Traduit une chaîne depuis le français ; renvoie l'original si absent/fr."""
    if lang == "fr" or not isinstance(s, str):
        return s
    return TR.get(lang, {}).get(s, s)


class _B:
    """Petit constructeur d'éléments avec ids uniques."""
    def __init__(self, lang="fr"):
        self.n = 0
        self.els = []
        self.lang = lang

    def _id(self):
        self.n += 1
        return f"e{self.n}"

    def rect(self, x, y, w, h, fill=None, stroke="#C6D7EC", sw=1.2, radius=10):
        e = {"id": self._id(), "type": "rect", "x": round(x), "y": round(y),
             "w": round(w), "h": round(h), "radius": radius}
        if fill:
            e["fill"] = fill
        if stroke:
            e["stroke"] = stroke; e["stroke_width"] = sw
        self.els.append(e); return e

    def ell(self, x, y, w, h, fill="#ffffff", stroke="#2563eb", sw=2):
        self.els.append({"id": self._id(), "type": "ellipse", "x": round(x),
                         "y": round(y), "w": round(w), "h": round(h),
                         "fill": fill, "stroke": stroke, "stroke_width": sw})

    def text(self, x, y, w, h, t, size=13, color="#0f172a", bold=False,
             align="left", font="body", italic=False):
        self.els.append({"id": self._id(), "type": "text", "x": round(x),
                         "y": round(y), "w": round(w), "h": round(h),
                         "text": _t(self.lang, t),
                         "size": size, "color": color, "bold": bold,
                         "align": align, "font": font, "italic": italic})

    def logo(self, x, y, w, h):
        self.els.append({"id": self._id(), "type": "logo", "x": round(x),
                         "y": round(y), "w": round(w), "h": round(h),
                         "fit": "contain"})

    def zone(self, x, y, w, h, title, key="slate", pad=10):
        fill, tc = C[key]
        self.rect(x, y, w, h, fill=fill, stroke="#C6D7EC", sw=1.2, radius=10)
        self.text(x + pad, y + 8, w - 2 * pad, 20, title, size=12.5,
                  color=tc, bold=True, font="heading")

    def header(self, name, W):
        self.rect(0, 0, W, HEADER_H, fill="#0F172A", stroke=None, radius=0)
        self.logo(24, 16, 120, 50)
        self.text(160, 16, W - 500, 30, name, size=24, color="#FFFFFF",
                  bold=True, font="title")
        self.text(160, 50, W - 500, 18, "{{company_name}}", size=12,
                  color="#93C5FD", font="subtitle")
        self.text(W - 320, 16, 296, 18, "Date : {{today}}", size=12,
                  color="#CBD5E1", align="right")
        self.text(W - 320, 36, 296, 18, "Projet : {{project_name}}", size=12,
                  color="#CBD5E1", align="right")
        self.text(W - 320, 56, 296, 18, "Réf. : {{project_reference}}", size=12,
                  color="#CBD5E1", align="right")


def _page(name, landscape, build, lang="fr"):
    W, H = (A3L if landscape else A3P)
    b = _B(lang)
    b.header(name, W)
    build(b, W, H)
    return {"id": "p1", "name": name,
            "layout": {"page_size": "a3",
                       "orientation": "landscape" if landscape else "portrait",
                       "background": "#FFFFFF", "elements": b.els}}


# ---------------------------------------------------------------------------
# Constructeurs par outil
# ---------------------------------------------------------------------------
def bmc(b, W, H):
    m, top = 24, HEADER_H + 14
    aw = W - 2 * m
    ah = H - top - m
    th = ah * 0.66
    bh = ah - th - 12
    cw = aw / 5
    x = m
    b.zone(x, top, cw - 8, th, "Partenaires clés", "sky");
    b.zone(x + cw, top, cw - 8, th / 2 - 6, "Activités clés", "blue")
    b.zone(x + cw, top + th / 2 + 6, cw - 8, th / 2 - 6, "Ressources clés", "blue")
    b.zone(x + 2 * cw, top, cw - 8, th, "Proposition de valeur", "violet")
    b.zone(x + 3 * cw, top, cw - 8, th / 2 - 6, "Relations clients", "green")
    b.zone(x + 3 * cw, top + th / 2 + 6, cw - 8, th / 2 - 6, "Canaux", "green")
    b.zone(x + 4 * cw, top, cw - 8, th, "Segments de clientèle", "amber")
    y2 = top + th + 12
    b.zone(m, y2, aw / 2 - 6, bh, "Structure de coûts", "red")
    b.zone(m + aw / 2 + 6, y2, aw / 2 - 6, bh, "Flux de revenus", "teal")


def vpc(b, W, H):
    m, top = 24, HEADER_H + 14
    aw = W - 2 * m
    ah = H - top - m
    half = aw / 2 - 12
    # Carte de valeur (carré) à gauche
    b.rect(m, top, half, ah, fill="#EDE9FE", stroke="#C6D7EC", radius=14)
    b.text(m + 14, top + 10, half - 28, 22, "Proposition de valeur", size=14,
           color="#6D28D9", bold=True, font="heading")
    zh = (ah - 60) / 3
    for i, (t, k) in enumerate([("Produits & services", "violet"),
                                ("Créateurs de gains", "green"),
                                ("Solutions à la douleur", "red")]):
        b.zone(m + 16, top + 44 + i * (zh + 4), half - 32, zh - 6, t, k)
    # Profil client (cercle) à droite
    cx = m + aw / 2 + 12
    b.ell(cx, top, half, ah, fill="#E0F2FE", stroke="#0369A1", sw=2)
    b.text(cx, top + 12, half, 22, "Profil du client", size=14, color="#0369A1",
           bold=True, align="center", font="heading")
    zw = half * 0.78
    for i, (t, k) in enumerate([("Tâches du client", "sky"),
                                ("Gains attendus", "green"),
                                ("Douleurs / freins", "red")]):
        b.zone(cx + (half - zw) / 2, top + 48 + i * (zh + 4), zw, zh - 8, t, k)


def empathy(b, W, H):
    m, top = 24, HEADER_H + 14
    aw = W - 2 * m
    ah = H - top - m
    barh = 80
    qh = (ah - barh - 12) / 2
    qw = aw / 2 - 6
    b.zone(m, top, qw, qh, "Pense & ressent", "violet")
    b.zone(m + qw + 12, top, qw, qh, "Voit", "sky")
    b.zone(m, top + qh + 6, qw, qh, "Entend", "amber")
    b.zone(m + qw + 12, top + qh + 6, qw, qh, "Dit & fait", "green")
    # centre
    ew, eh = 220, 120
    b.ell(W / 2 - ew / 2, top + ah / 2 - barh / 2 - eh / 2, ew, eh,
          fill="#FFFFFF", stroke="#2563eb", sw=2.5)
    b.text(W / 2 - ew / 2, top + ah / 2 - barh / 2 - 14, ew, 20,
           "Utilisateur / persona", size=13, color="#1E40AF", bold=True,
           align="center")
    y2 = top + 2 * qh + 12
    b.zone(m, y2, aw / 2 - 6, barh, "Douleurs / peurs / freins", "red")
    b.zone(m + aw / 2 + 6, y2, aw / 2 - 6, barh, "Gains / besoins / objectifs", "teal")


def persona(b, W, H):
    m, top = 24, HEADER_H + 14
    aw = W - 2 * m
    ah = H - top - m
    lw = 320
    # Colonne gauche
    b.rect(m, top, lw, ah, fill="#F1F5F9", stroke="#C6D7EC", radius=14)
    b.ell(m + lw / 2 - 55, top + 22, 110, 110, fill="#DBEAFE", stroke="#2563eb", sw=2)
    b.text(m + 10, top + 142, lw - 20, 24, "Prénom NOM", size=18, color="#0f172a",
           bold=True, align="center", font="title")
    b.text(m + 10, top + 168, lw - 20, 18, "Rôle / fonction", size=13,
           color="#475569", align="center")
    for i, lab in enumerate(["Âge :", "Localisation :", "Métier :",
                             "Situation :", "Niveau technique :"]):
        b.text(m + 16, top + 205 + i * 30, lw - 32, 20, lab, size=12.5,
               color="#334155", bold=True)
    # Zones à droite
    rx = m + lw + 14
    rw = aw - lw - 14
    zw = rw / 2 - 6
    zh = ah / 3 - 8
    grid = [("Objectifs", "green"), ("Frustrations", "red"),
            ("Motivations", "amber"), ("Canaux préférés", "sky"),
            ("Bio / contexte", "violet"), ("Citation", "teal")]
    for i, (t, k) in enumerate(grid):
        cx = rx + (i % 2) * (zw + 12)
        cy = top + (i // 2) * (zh + 12)
        b.zone(cx, cy, zw, zh, t, k)


def journey(b, W, H):
    m, top = 24, HEADER_H + 14
    aw = W - 2 * m
    ah = H - top - m
    labels = ["Actions", "Points de contact", "Pensées", "Émotions",
              "Douleurs", "Opportunités"]
    phases = ["Découverte", "Considération", "Décision / achat",
              "Utilisation", "Fidélisation"]
    lw = 160
    head_h = 34
    rows = len(labels)
    rh = (ah - head_h) / rows
    cw = (aw - lw) / len(phases)
    # en-tête des phases
    b.rect(m, top, lw, head_h, fill="#0F172A", stroke=None, radius=6)
    b.text(m + 8, top + 8, lw - 16, 20, "Étapes", size=12, color="#fff", bold=True)
    for j, ph in enumerate(phases):
        b.rect(m + lw + j * cw, top, cw - 4, head_h, fill="#1E40AF", stroke=None, radius=6)
        b.text(m + lw + j * cw + 6, top + 8, cw - 12, 20, ph, size=12,
               color="#fff", bold=True, align="center")
    # lignes
    for i, lab in enumerate(labels):
        y = top + head_h + i * rh
        fill = C["slate"][0] if i % 2 == 0 else "#FFFFFF"
        b.rect(m, y, lw, rh - 3, fill=C["sky"][0], stroke="#C6D7EC")
        b.text(m + 8, y + 8, lw - 16, 20, lab, size=12, color=C["sky"][1], bold=True)
        for j in range(len(phases)):
            b.rect(m + lw + j * cw, y, cw - 4, rh - 3, fill=fill, stroke="#E2E8F0")


def problem_statement(b, W, H):
    m, top = 24, HEADER_H + 14
    aw = W - 2 * m
    ah = H - top - m
    n = 3
    gap = 14
    ch = (ah - (n - 1) * gap) / n
    fields = ["Problème observé :", "Personnes concernées :",
              "Contexte / quand :", "Impact / conséquence :",
              "Hypothèse de solution :"]
    for c in range(n):
        y = top + c * (ch + gap)
        b.rect(m, y, aw, ch, fill="#F8FAFC", stroke="#C6D7EC", radius=12)
        b.text(m + 14, y + 10, aw - 28, 22, f"Énoncé du problème #{c + 1}",
               size=14, color="#1E40AF", bold=True, font="heading")
        fh = (ch - 46) / len(fields)
        for i, f in enumerate(fields):
            fy = y + 40 + i * fh
            b.text(m + 16, fy, 220, 18, f, size=11.5, color="#334155", bold=True)
            b.rect(m + 240, fy + 2, aw - 260, fh - 8, fill="#FFFFFF", stroke="#E2E8F0", radius=6)


def pestel(b, W, H):
    m, top = 24, HEADER_H + 14
    aw = W - 2 * m
    ah = H - top - m
    cols, rows = 3, 2
    gap = 12
    cw = (aw - (cols - 1) * gap) / cols
    rh = (ah - (rows - 1) * gap) / rows
    cells = [("Politique", "blue"), ("Économique", "green"),
             ("Socioculturel", "amber"), ("Technologique", "violet"),
             ("Environnemental", "teal"), ("Légal", "red")]
    for i, (t, k) in enumerate(cells):
        cx = m + (i % cols) * (cw + gap)
        cy = top + (i // cols) * (rh + gap)
        b.zone(cx, cy, cw, rh, t, k)


def onion(b, W, H):
    m, top = 24, HEADER_H + 14
    ah = H - top - m
    cx = W / 2
    cy = top + ah / 2
    layers = [("Environnement / marché", "#E0F2FE", "#0369A1"),
              ("Organisation & partenaires", "#DBEAFE", "#1E40AF"),
              ("Parties prenantes directes", "#EDE9FE", "#6D28D9"),
              ("Cœur : produit / valeur", "#FFFFFF", "#0F172A")]
    rmax = min(ah, (W - 2 * m)) / 2 * 0.94
    step = rmax / len(layers)
    for i, (lab, fill, stroke) in enumerate(layers):
        r = rmax - i * step
        b.ell(cx - r, cy - r, 2 * r, 2 * r, fill=fill, stroke=stroke, sw=2)
        # étiquette au sommet de chaque anneau
        ly = cy - r + 8
        b.text(cx - 150, ly, 300, 18, lab, size=12.5, color=stroke, bold=True,
               align="center")
    # légende
    b.text(m, top, 360, 20, "Diagramme en oignon — parties prenantes",
           size=13, color="#334155", bold=True, italic=True)


TOOLS = [
    ("bmc-a3", "Business Model Canvas", True, bmc),
    ("vpc-a3", "Value Proposition Canvas", True, vpc),
    ("empathy-a3", "Empathy Map", True, empathy),
    ("persona-a3", "Persona", True, persona),
    ("journey-a3", "Customer Journey Map", True, journey),
    ("problem-a3", "Problem Statement", False, problem_statement),
    ("pestel-a3", "PESTEL", True, pestel),
    ("onion-a3", "Onion Diagram", True, onion),
]


# Orientation et gabarit de description par langue.
_ORIENT = {
    "fr": ("paysage", "portrait"), "en": ("landscape", "portrait"),
    "de": ("Querformat", "Hochformat"), "it": ("orizzontale", "verticale"),
}
_DESC = {
    "fr": "Outil d'analyse « {name} » au format Template A3 ({o}), modifiable et exportable en PDF / PNG / SVG.",
    "en": "«{name}» analysis tool in A3 Template format ({o}), editable and exportable to PDF / PNG / SVG.",
    "de": "Analysewerkzeug „{name}“ im A3-Vorlagenformat ({o}), bearbeitbar und exportierbar als PDF / PNG / SVG.",
    "it": "Strumento di analisi «{name}» in formato Template A3 ({o}), modificabile ed esportabile in PDF / PNG / SVG.",
}
ALL_LANGS = ["fr", "en", "de", "it"]

# Nom de chaque outil par langue (point 5 : un nom par langue, configurable).
# Les méthodes au nom international restent identiques dans les quatre langues.
NAMES = {
    "bmc-a3": {"fr": "Business Model Canvas", "en": "Business Model Canvas",
               "de": "Business Model Canvas", "it": "Business Model Canvas"},
    "vpc-a3": {"fr": "Value Proposition Canvas", "en": "Value Proposition Canvas",
               "de": "Value Proposition Canvas", "it": "Value Proposition Canvas"},
    "empathy-a3": {"fr": "Carte d'empathie", "en": "Empathy Map",
                   "de": "Empathy Map", "it": "Mappa dell'empatia"},
    "persona-a3": {"fr": "Persona", "en": "Persona", "de": "Persona", "it": "Persona"},
    "journey-a3": {"fr": "Parcours client", "en": "Customer Journey Map",
                   "de": "Customer Journey Map", "it": "Mappa del percorso cliente"},
    "problem-a3": {"fr": "Énoncé du problème", "en": "Problem Statement",
                   "de": "Problemstellung", "it": "Definizione del problema"},
    "pestel-a3": {"fr": "PESTEL", "en": "PESTEL", "de": "PESTEL", "it": "PESTEL"},
    "onion-a3": {"fr": "Diagramme en oignon", "en": "Onion Diagram",
                 "de": "Zwiebeldiagramm", "it": "Diagramma a cipolla"},
}


class Command(BaseCommand):
    help = ("Génère les 8 outils d'analyse au format Template A3. Chaque outil "
            "est un seul modèle multilingue (nom + contenu par langue fr/en/de/it).")

    def add_arguments(self, parser):
        parser.add_argument(
            "--langs", default=",".join(ALL_LANGS),
            help="Langues à activer, séparées par des virgules (défaut : fr,en,de,it).")

    def handle(self, *args, **options):
        from documents.models import DocumentTemplate
        langs = [l.strip() for l in str(options["langs"]).split(",")
                 if l.strip() in ALL_LANGS] or ALL_LANGS
        primary = "fr" if "fr" in langs else langs[0]
        count = 0
        for slug, name, landscape, fn in TOOLS:
            names = {l: NAMES.get(slug, {}).get(l, name) for l in langs}
            pages_i18n = {l: [_page(names[l], landscape, fn, l)] for l in langs}
            o = _ORIENT[primary][0 if landscape else 1]
            defaults = {
                "name": names[primary],
                "names": names,
                "language": primary,
                "languages": langs,
                "doc_type": "a3", "builder_key": "a3",
                "is_block_based": False, "schema": [],
                "is_system": True,
                "description": _DESC[primary].format(name=names[primary], o=o),
                "settings": {"a3_export": "pdf",
                             "a3_pages": pages_i18n[primary],
                             "a3_pages_i18n": pages_i18n},
            }
            obj, created = DocumentTemplate.objects.get_or_create(
                slug=slug, defaults=defaults)
            if not created:
                for k, v in defaults.items():
                    setattr(obj, k, v)
                obj.save()
            count += 1
            self.stdout.write(
                f"{'Créé' if created else 'Mis à jour'} : {names[primary]} "
                f"({'/'.join(langs)})")

        # Nettoyage des anciens modèles A3 mono-langue (slug-en/-de/-it),
        # remplacés par les modèles multilingues ci-dessus.
        from django.db.models import ProtectedError
        removed = 0
        stale = [f"{slug}-{l}" for slug, *_ in TOOLS for l in ("en", "de", "it")]
        for obj in DocumentTemplate.objects.filter(slug__in=stale):
            try:
                obj.delete()
                removed += 1
            except ProtectedError:
                self.stdout.write(
                    f"Conservé (documents liés) : {obj.slug}")
        if removed:
            self.stdout.write(f"Anciens modèles mono-langue supprimés : {removed}")
        self.stdout.write(self.style.SUCCESS(
            f"Outils A3 générés : {count} modèle(s) multilingue(s)."))
