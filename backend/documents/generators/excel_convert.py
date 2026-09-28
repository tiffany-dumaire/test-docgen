"""Conversion des onglets Excel « table » / « info » vers le moteur « grille ».

Chaque cellule de grille porte son style (gras, couleurs, alignement, format
numérique), ses fusions et les tailles de colonnes. Utilisé par la migration
0019 et par la commande seed_data pour homogénéiser tous les modèles Excel.
"""

ORANGE = "#EC6608"
GROUP = "#B44E00"
LIGHT = "#F5F3EF"
CHARCOAL = "#1D1E1B"
DATA_ROWS = 12


def _num_format(col):
    t = (col or {}).get("type")
    if t == "currency":
        sym = col.get("symbol") or "€"
        dec = int(col.get("decimals", 2) or 0)
        return f'#,##0{("." + "0" * dec) if dec else ""}" {sym}"'
    if t == "decimal":
        dec = int(col.get("decimals", 2) or 0)
        return "#,##0" + (("." + "0" * dec) if dec else "")
    if t == "integer":
        return "#,##0"
    if t == "percent":
        return "0.00%"
    if t == "date":
        return "dd/mm/yyyy"
    return None


def _col_width(col):
    return 26 if (col or {}).get("type") == "text" else 16


def table_to_grid(sdef, data_rows=DATA_ROWS):
    cols = sdef.get("columns") or []
    groups = sdef.get("groups") or []
    cells = []
    r = 1
    if groups:
        c = 1
        for g in groups:
            span = max(1, int(g.get("span", 1) or 1))
            label = g.get("label", "") or ""
            if label:
                cells.append({"row": r, "col": c, "value": label, "bold": True,
                              "bg": GROUP, "color": "#FFFFFF", "align": "center",
                              "col_span": span, "border": True})
            c += span
        r += 1
    for i, col in enumerate(cols, 1):
        cells.append({"row": r, "col": i, "value": col.get("label", f"Col {i}"),
                      "bold": True, "bg": ORANGE, "color": "#FFFFFF",
                      "align": "center", "wrap": True, "border": True})
    header_row = r
    for dr in range(1, data_rows + 1):
        for i, col in enumerate(cols, 1):
            cell = {"row": header_row + dr, "col": i, "value": "", "border": True}
            nf = _num_format(col)
            if nf:
                cell["number_format"] = nf
                cell["align"] = "right"
            cells.append(cell)
    if sdef.get("show_totals"):
        tr = header_row + data_rows + 1
        cells.append({"row": tr, "col": 1, "value": "Total", "bold": True,
                      "bg": LIGHT, "color": CHARCOAL, "border": True})
        for i, col in enumerate(cols, 1):
            if i == 1:
                continue
            cell = {"row": tr, "col": i, "value": "", "bold": True, "bg": LIGHT,
                    "border": True}
            nf = _num_format(col)
            if nf:
                cell["number_format"] = nf
                cell["align"] = "right"
            cells.append(cell)
    col_widths = {str(i): _col_width(col) for i, col in enumerate(cols, 1)}
    return {"id": sdef.get("id"), "name": sdef.get("name", "Feuille"),
            "title": sdef.get("title", ""), "type": "grid",
            "cells": cells, "col_widths": col_widths, "row_heights": {"1": 26}}


def info_to_grid(sdef):
    cells = []
    for i, item in enumerate(sdef.get("items", []), 1):
        cells.append({"row": i, "col": 1, "value": item.get("label", ""),
                      "bold": True, "bg": LIGHT, "color": CHARCOAL, "border": True})
        cells.append({"row": i, "col": 2, "value": item.get("value", ""),
                      "border": True})
    return {"id": sdef.get("id"), "name": sdef.get("name", "Informations"),
            "title": sdef.get("title", ""), "type": "grid",
            "cells": cells, "col_widths": {"1": 26, "2": 24}}


def convert_sheets(sheets):
    """Convertit une liste d'onglets en onglets « grille ».

    - table -> grille (en-têtes + lignes vides + totaux)
    - info  -> grille libellé/valeur
    - grid  -> conservé tel quel
    - pivot -> ignoré (synthèse calculée, non statique)
    """
    out = []
    for sdef in sheets or []:
        stype = sdef.get("type", "table")
        if stype == "table":
            out.append(table_to_grid(sdef))
        elif stype == "info":
            out.append(info_to_grid(sdef))
        elif stype == "grid":
            out.append(sdef)
    return out
