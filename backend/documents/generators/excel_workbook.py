"""
Générateur de classeurs Excel personnalisables.

Un modèle Excel « classeur » décrit plusieurs onglets dans
`template.settings["excel"]["sheets"]`. Trois types d'onglets :

- ``table``  : tableau de données à colonnes typées, avec regroupements
               d'en-têtes sur deux lignes (ligne 1 = groupes fusionnés,
               ligne 2 = colonnes, ligne 3+ = données).
- ``pivot``  : tableau croisé calculé à partir d'un onglet ``table``.
- ``info``   : informations fixes typées (date, texte, monnaie,
               nombre entier / à virgule, pourcentage).

Les données saisies pour le document se trouvent dans
``document.data["sheets"][<id_onglet>]`` :
``{"columns": [...], "rows": [[...], ...]}``.
"""
from datetime import date, datetime

from .base import GenerationContext, interpolate, placeholder_context

# Couleurs de la charte
PRIMARY = "1F497D"
GROUP_FILL = "1F497D"
HEADER_FILL = "4472C4"
ALT_FILL = "EDF2FA"
LIGHT = "F5F7FB"
BORDER_COLOR = "BFC7D2"

NUMBER_FORMATS = {
    "text": None,
    "integer": "#,##0",
    "decimal": "#,##0.00",
    "percent": "0.00%",
    "date": "dd/mm/yyyy",
}


def _fmt(col):
    """Format Excel d'après le type de colonne / champ."""
    t = col.get("type", "text")
    if t == "currency":
        symbol = col.get("symbol", "€")
        dec = int(col.get("decimals", 2))
        zeros = "0" * dec
        return f'#,##0.{zeros} "{symbol}"' if dec else f'#,##0 "{symbol}"'
    if t == "decimal":
        dec = int(col.get("decimals", 2))
        return "#,##0." + ("0" * dec) if dec else "#,##0"
    return NUMBER_FORMATS.get(t)


def _coerce(value, col, pctx):
    """Convertit une valeur (souvent une chaîne) selon le type attendu."""
    t = col.get("type", "text")
    if isinstance(value, str):
        value = interpolate(value, pctx)
    if value in (None, ""):
        return None
    if t in ("integer", "decimal", "currency", "percent"):
        if isinstance(value, (int, float)):
            num = float(value)
        else:
            cleaned = (str(value).replace(" ", "").replace("\u202f", "")
                       .replace("€", "").replace("%", "").replace(",", "."))
            try:
                num = float(cleaned)
            except ValueError:
                return str(value)
        if t == "integer":
            return int(round(num))
        if t == "percent":
            # une valeur "20" ou "0.2" -> 20 % / 20 %
            return num / 100.0 if abs(num) > 1 else num
        return num
    if t == "date":
        if isinstance(value, (date, datetime)):
            return value
        for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y", "%Y/%m/%d"):
            try:
                return datetime.strptime(str(value), fmt).date()
            except ValueError:
                continue
        return str(value)
    return str(value)


def _sheet_name(name, used):
    """Nom d'onglet valide (<=31 car., caractères interdits retirés, unique)."""
    for ch in "[]:*?/\\":
        name = name.replace(ch, " ")
    name = (name.strip() or "Feuille")[:31]
    base, i = name, 2
    while name.lower() in used:
        suffix = f" {i}"
        name = base[:31 - len(suffix)] + suffix
        i += 1
    used.add(name.lower())
    return name


def _effective_columns(sdef, sheet_data):
    """Colonnes réellement utilisées (modèle + colonnes ajoutées au remplissage)."""
    tpl_cols = list(sdef.get("columns", []))
    data_cols = (sheet_data or {}).get("columns")
    if not data_cols:
        return tpl_cols
    # data_cols peut être une liste de libellés ou de dicts
    merged = []
    for i, dc in enumerate(data_cols):
        if isinstance(dc, dict):
            base = dict(tpl_cols[i]) if i < len(tpl_cols) else {}
            base.update(dc)
            merged.append(base)
        else:  # libellé simple
            if i < len(tpl_cols):
                c = dict(tpl_cols[i]); c["label"] = dc; merged.append(c)
            else:
                merged.append({"label": str(dc), "type": "text",
                               "key": f"col{i + 1}"})
    return merged


def _norm_hex(color):
    """Normalise une couleur hex en 6 caractères sans #."""
    c = str(color or "").lstrip("#").strip()
    if len(c) == 3:
        c = "".join(ch * 2 for ch in c)
    return (c or "1F497D")[:6].upper()


def _shade(hex_color, factor):
    """Éclaircit (factor>0.5) ou fonce une couleur. factor dans [0,1]."""
    h = _norm_hex(hex_color)
    r, g, b = int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)
    if factor >= 0.5:  # éclaircir vers le blanc
        t = (factor - 0.5) * 2
        r = int(r + (255 - r) * t); g = int(g + (255 - g) * t); b = int(b + (255 - b) * t)
    else:  # foncer vers le noir
        t = 1 - factor * 2
        r = int(r * (1 - t)); g = int(g * (1 - t)); b = int(b * (1 - t))
    return f"{r:02X}{g:02X}{b:02X}"


def _expand_formula(formula, key_to_letter, rownum):
    """Remplace les {clé} d'une formule de colonne par la référence <lettre><ligne>."""
    import re
    if not str(formula).startswith("="):
        formula = "=" + str(formula)

    def repl(m):
        key = m.group(1).strip()
        letter = key_to_letter.get(key)
        return f"{letter}{rownum}" if letter else m.group(0)

    return re.sub(r"\{([^{}]+)\}", repl, formula)


_OP_MAP = {
    ">": "greaterThan", ">=": "greaterThanOrEqual",
    "<": "lessThan", "<=": "lessThanOrEqual",
    "==": "equal", "=": "equal", "!=": "notEqual", "<>": "notEqual",
    "between": "between",
}


def _col_range(rule_col, cols, col_letter, first, last):
    """Plage A1 correspondant à une colonne (par clé/libellé) ou à toutes."""
    if rule_col in (None, "", "*", "all"):
        return f"{col_letter[0]}{first}:{col_letter[len(cols)-1]}{last}"
    for i, c in enumerate(cols):
        if rule_col in (c.get("key"), c.get("label")):
            return f"{col_letter[i]}{first}:{col_letter[i]}{last}"
    return None


def _apply_cf(ws, rule, cols, col_letter, first, last,
              CellIsRule, ColorScaleRule, FormulaRule, PatternFill, Font):
    rng = _col_range(rule.get("column"), cols, col_letter, first, last)
    if not rng:
        return
    kind = rule.get("kind", "cellis")
    if kind == "color_scale":
        ws.conditional_formatting.add(rng, ColorScaleRule(
            start_type="min", start_color=_norm_hex(rule.get("min_color", "F8696B")),
            mid_type="percentile", mid_value=50,
            mid_color=_norm_hex(rule.get("mid_color", "FFEB84")),
            end_type="max", end_color=_norm_hex(rule.get("max_color", "63BE7B"))))
        return
    if kind == "data_bar":
        from openpyxl.formatting.rule import DataBarRule
        ws.conditional_formatting.add(rng, DataBarRule(
            start_type="min", end_type="max",
            color=_norm_hex(rule.get("color", "638EC6"))))
        return
    # règle de type « la cellule est … »
    op = _OP_MAP.get(rule.get("op", ">"), "greaterThan")
    fill = PatternFill("solid", fgColor=_norm_hex(rule.get("fill", "FFC7CE")))
    font = Font(color=_norm_hex(rule.get("font", "9C0006"))) if rule.get("font") else None
    v1 = rule.get("value")
    formula = [str(v1)]
    if op == "between":
        formula = [str(v1), str(rule.get("value2", v1))]
    ws.conditional_formatting.add(rng, CellIsRule(
        operator=op, formula=formula, fill=fill, font=font))


def _apply_validation(ws, val, cols, col_letter, first, last, DataValidation):
    rng = _col_range(val.get("column"), cols, col_letter, first, last)
    if not rng:
        return
    kind = val.get("kind", "list")
    if kind == "list":
        options = val.get("options", [])
        if isinstance(options, str):
            options = [o.strip() for o in options.split(",") if o.strip()]
        if not options:
            return
        joined = ",".join(str(o).replace(",", " ") for o in options)
        dv = DataValidation(type="list", formula1=f'"{joined}"',
                            allow_blank=True, showDropDown=False)
    elif kind in ("whole", "decimal", "date", "textLength"):
        op = val.get("op", "between")
        dv = DataValidation(type=kind, operator=op,
                            formula1=str(val.get("value", 0)),
                            formula2=str(val.get("value2", 0)),
                            allow_blank=True)
    else:
        return
    if val.get("message"):
        dv.prompt = val["message"]; dv.promptTitle = val.get("title", "Saisie")
    dv.error = val.get("error", "Valeur non autorisée.")
    dv.errorTitle = "Validation"
    ws.add_data_validation(dv)
    dv.add(rng)


NUMBER_FORMATS_END = True  # marqueur


def render(ctx: GenerationContext) -> bytes:
    import io

    from openpyxl import Workbook
    from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
    from openpyxl.utils import get_column_letter

    pctx = placeholder_context(ctx)
    excel_cfg = (ctx.document.template.settings or {}).get("excel", {})
    sheets = excel_cfg.get("sheets", [])
    data_sheets = (ctx.data or {}).get("sheets", {})

    thin = Side(style="thin", color=BORDER_COLOR)
    border = Border(left=thin, right=thin, top=thin, bottom=thin)
    group_font = Font(bold=True, color="FFFFFF", size=11)
    header_font = Font(bold=True, color="FFFFFF")
    title_font = Font(bold=True, color=PRIMARY, size=14)
    label_font = Font(bold=True, color=PRIMARY)
    center = Alignment(horizontal="center", vertical="center", wrap_text=True)
    left = Alignment(horizontal="left", vertical="center")

    def autosize(ws, ncols, minw=10, maxw=48):
        for c in range(1, ncols + 1):
            letter = get_column_letter(c)
            longest = minw
            for cell in ws[letter]:
                if cell.value is not None:
                    longest = max(longest, len(str(cell.value)) + 2)
            ws.column_dimensions[letter].width = min(longest, maxw)

    wb = Workbook()
    wb.remove(wb.active)
    used_names = set()

    # 1) Pré-calcule les données brutes des onglets « table » (pour les pivots)
    tables = {}
    for sdef in sheets:
        if sdef.get("type") == "table":
            cols = _effective_columns(sdef, data_sheets.get(sdef.get("id"), {}))
            raw_rows = (data_sheets.get(sdef.get("id"), {}) or {}).get("rows", [])
            coerced = []
            for r in raw_rows:
                row = list(r) + [None] * (len(cols) - len(r))
                coerced.append([_coerce(row[i], cols[i], pctx)
                                for i in range(len(cols))])
            tables[sdef.get("id")] = {"def": sdef, "columns": cols, "rows": coerced}

    # 2) Construit les onglets dans l'ordre défini
    for sdef in sheets:
        stype = sdef.get("type", "table")
        ws = wb.create_sheet(_sheet_name(sdef.get("name", "Feuille"), used_names))

        # Titre d'onglet (facultatif)
        title = interpolate(sdef.get("title", ""), pctx)
        start_row = 1
        if title:
            ws.cell(row=1, column=1, value=title).font = title_font
            start_row = 3

        # ---- Onglet TABLE ----
        if stype == "table":
            from openpyxl.formatting.rule import (CellIsRule, ColorScaleRule,
                                                  FormulaRule)
            from openpyxl.worksheet.datavalidation import DataValidation

            info = tables.get(sdef.get("id"))
            cols = info["columns"]
            rows = info["rows"]
            groups = sdef.get("groups", [])
            ncols = len(cols)
            r = start_row

            # Couleur principale des tableaux (partagée Word/PDF/Excel)
            base_color = _norm_hex((ctx.document.template.settings or {})
                                   .get("table_color") or sdef.get("header_color")
                                   or GROUP_FILL)
            grp_fill = PatternFill("solid", fgColor=base_color)
            hdr_fill = PatternFill("solid", fgColor=_shade(base_color, 0.18))
            alt_fill = PatternFill("solid", fgColor=_shade(base_color, 0.86))

            # index -> lettre de colonne, et clé -> lettre
            col_letter = {i: get_column_letter(i + 1) for i in range(ncols)}
            key_to_letter = {}
            for i, col in enumerate(cols):
                key_to_letter[col.get("key", col.get("label", f"col{i+1}"))] = col_letter[i]

            if groups:
                c = 1
                for g in groups:
                    span = max(1, int(g.get("span", 1)))
                    span = min(span, ncols - (c - 1))
                    if span <= 0:
                        break
                    cell = ws.cell(row=r, column=c, value=g.get("label", ""))
                    cell.fill = PatternFill("solid", fgColor=_norm_hex(g.get("color", base_color)))
                    cell.font = group_font
                    cell.alignment = center
                    cell.border = border
                    if span > 1:
                        ws.merge_cells(start_row=r, start_column=c,
                                       end_row=r, end_column=c + span - 1)
                        for cc in range(c + 1, c + span):
                            ws.cell(row=r, column=cc).border = border
                    c += span
                while c <= ncols:
                    ws.cell(row=r, column=c).border = border
                    c += 1
                r += 1

            # En-têtes de colonnes
            for i, col in enumerate(cols, start=1):
                cell = ws.cell(row=r, column=i, value=col.get("label", f"Colonne {i}"))
                cell.fill = hdr_fill
                cell.font = header_font
                cell.alignment = center
                cell.border = border
            header_row = r
            first_data = header_row + 1
            r += 1

            # Données typées (avec formules de colonne éventuelles)
            for ri, row in enumerate(rows):
                rownum = r
                for i, col in enumerate(cols, start=1):
                    formula = col.get("formula")
                    if formula:
                        value = _expand_formula(formula, key_to_letter, rownum)
                    else:
                        value = row[i - 1]
                    cell = ws.cell(row=rownum, column=i, value=value)
                    cell.border = border
                    nf = _fmt(col)
                    if nf:
                        cell.number_format = nf
                    if ri % 2 == 1:
                        cell.fill = alt_fill
                r += 1
            last_data = r - 1

            # Ligne de totaux
            if sdef.get("show_totals") and rows:
                ws.cell(row=r, column=1, value="Total").font = label_font
                for i, col in enumerate(cols, start=1):
                    if col.get("type") in ("integer", "decimal", "currency"):
                        letter = get_column_letter(i)
                        cell = ws.cell(
                            row=r, column=i,
                            value=f"=SUM({letter}{first_data}:{letter}{last_data})")
                        cell.font = label_font
                        nf = _fmt(col)
                        if nf:
                            cell.number_format = nf
                    ws.cell(row=r, column=i).border = border
                r += 1

            # Formules de cellules libres : {"cell":"F2","formula":"=..."}
            for cf in sdef.get("cell_formulas", []):
                coord = cf.get("cell")
                formula = cf.get("formula", "")
                if not coord or not formula:
                    continue
                formula = (formula.replace("{first}", str(first_data))
                           .replace("{last}", str(last_data))
                           .replace("{header}", str(header_row)))
                try:
                    ws[coord] = formula
                except Exception:
                    pass

            # Mises en forme conditionnelles
            if rows:
                for rule in sdef.get("conditional_formats", []):
                    _apply_cf(ws, rule, cols, col_letter, first_data, last_data,
                              CellIsRule, ColorScaleRule, FormulaRule, PatternFill, Font)

            # Validations (listes déroulantes, plages numériques/dates)
            for val in sdef.get("validations", []):
                _apply_validation(ws, val, cols, col_letter, first_data,
                                  max(last_data, first_data + 50), DataValidation)

            ws.freeze_panes = ws.cell(row=header_row + 1, column=1)
            autosize(ws, ncols)

        # ---- Onglet PIVOT (tableau croisé calculé) ----
        elif stype == "pivot":
            _write_pivot(ws, sdef, tables, pctx, start_row,
                         border, header_font, label_font, center,
                         PatternFill, get_column_letter, autosize)

        # ---- Onglet GRID (grille libre : style par cellule, fusions, tailles) ----
        elif stype == "grid":
            _write_grid(ws, sdef, pctx, start_row,
                        Font, PatternFill, Alignment, Border, Side,
                        get_column_letter)
            _add_sheet_images(ws, sdef, ctx, start_row)

        # ---- Onglet INFO (cellules fixes typées) ----
        elif stype == "info":
            r = start_row
            for item in sdef.get("items", []):
                label = interpolate(item.get("label", ""), pctx)
                ws.cell(row=r, column=1, value=label).font = label_font
                ws.cell(row=r, column=1).border = border
                val = _coerce(item.get("value", ""), item, pctx)
                cell = ws.cell(row=r, column=2, value=val)
                nf = _fmt(item)
                if nf:
                    cell.number_format = nf
                cell.border = border
                cell.alignment = left
                r += 1
            autosize(ws, 2, minw=16)

    if not wb.sheetnames:
        wb.create_sheet("Feuille 1")

    buffer = io.BytesIO()
    wb.save(buffer)
    return buffer.getvalue()


def _logo_source_path(ctx, image):
    """Chemin fichier local d'une image de feuille (logo entreprise ou média)."""
    from .block_gen import _logo_path, _resolve_asset
    source = (image.get("source") or "company").lower()
    if source == "url":
        return _resolve_asset(image.get("url"))
    return _logo_path(ctx)


def _add_sheet_images(ws, sdef, ctx, start_row):
    """Ajoute les images (logo) positionnées et dimensionnées d'une grille.

    sdef["images"] = [{
        source: "company" | "url", url, col, row,
        width, height,            # px (si une seule est donnée, ratio conservé)
        offset_x, offset_y,       # décalage px depuis le coin de la cellule
    }]
    Les index col/row sont 1-indexés et relatifs au début de l'onglet.
    """
    images = sdef.get("images") or []
    if not images:
        return
    try:
        from openpyxl.drawing.image import Image as XLImage
        from openpyxl.drawing.spreadsheet_drawing import (AnchorMarker,
                                                          OneCellAnchor)
        from openpyxl.drawing.xdr import XDRPositiveSize2D
        from openpyxl.utils.units import pixels_to_EMU
    except Exception:
        return
    off = start_row - 1
    for image in images:
        path = _logo_source_path(ctx, image)
        if not path:
            continue
        try:
            img = XLImage(path)
        except Exception:
            continue
        # Dimensions : conserve le ratio si une seule dimension est fournie.
        nat_w, nat_h = img.width or 1, img.height or 1
        w = image.get("width"); h = image.get("height")
        try:
            if w and not h:
                w = float(w); h = w * nat_h / nat_w
            elif h and not w:
                h = float(h); w = h * nat_w / nat_h
            elif w and h:
                w = float(w); h = float(h)
            else:
                w, h = float(nat_w), float(nat_h)
        except (TypeError, ValueError, ZeroDivisionError):
            w, h = float(nat_w), float(nat_h)
        try:
            c = max(1, int(image.get("col", 1))) - 1
            r = max(1, int(image.get("row", 1))) - 1 + off
        except (TypeError, ValueError):
            continue
        offx = pixels_to_EMU(int(image.get("offset_x", 0) or 0))
        offy = pixels_to_EMU(int(image.get("offset_y", 0) or 0))
        marker = AnchorMarker(col=c, colOff=offx, row=r, rowOff=offy)
        img.anchor = OneCellAnchor(
            _from=marker,
            ext=XDRPositiveSize2D(pixels_to_EMU(int(w)), pixels_to_EMU(int(h))))
        ws.add_image(img)


def _write_grid(ws, sdef, pctx, start_row, Font, PatternFill, Alignment,
                Border, Side, get_column_letter):
    """Grille libre : chaque cellule porte sa valeur, son style, sa fusion.

    sdef = {
      "cells": [{row,col,value,bold,italic,color,bg,align,valign,size,wrap,
                 number_format,border,col_span,row_span}],
      "col_widths": {"<col>": width}, "row_heights": {"<row>": height},
    }
    Les index de ligne/colonne sont relatifs au début de l'onglet (1 = 1re ligne
    sous le titre) et 1-indexés.
    """
    thin = Side(style="thin", color=BORDER_COLOR)
    box = Border(left=thin, right=thin, top=thin, bottom=thin)
    off = start_row - 1  # décalage pour laisser la place au titre

    for cell in (sdef.get("cells") or []):
        try:
            r = int(cell.get("row", 1)) + off
            c = int(cell.get("col", 1))
        except (TypeError, ValueError):
            continue
        if r < 1 or c < 1:
            continue
        raw = cell.get("value", "")
        value = interpolate(raw, pctx) if isinstance(raw, str) else raw
        # Conversion numérique douce si demandé via number_format numérique.
        target = ws.cell(row=r, column=c, value=value)
        cspan = max(1, int(cell.get("col_span", 1) or 1))
        rspan = max(1, int(cell.get("row_span", 1) or 1))
        if cspan > 1 or rspan > 1:
            try:
                ws.merge_cells(start_row=r, start_column=c,
                               end_row=r + rspan - 1, end_column=c + cspan - 1)
            except Exception:
                pass
        color = _norm_hex(cell.get("color")) if cell.get("color") else None
        target.font = Font(bold=bool(cell.get("bold")),
                           italic=bool(cell.get("italic")),
                           underline="single" if cell.get("underline") else None,
                           size=float(cell.get("size") or 11),
                           color=color or "000000")
        bg = _norm_hex(cell.get("bg")) if cell.get("bg") else None
        if bg:
            target.fill = PatternFill("solid", fgColor=bg)
        target.alignment = Alignment(
            horizontal=cell.get("align") or "left",
            vertical=cell.get("valign") or "center",
            wrap_text=bool(cell.get("wrap")))
        if cell.get("number_format"):
            target.number_format = cell["number_format"]
        if cell.get("border", True):
            # Applique la bordure à toute la plage fusionnée.
            for rr in range(r, r + rspan):
                for cc in range(c, c + cspan):
                    ws.cell(row=rr, column=cc).border = box

    for col, width in (sdef.get("col_widths") or {}).items():
        try:
            ws.column_dimensions[get_column_letter(int(col))].width = float(width)
        except (TypeError, ValueError):
            pass
    for row, height in (sdef.get("row_heights") or {}).items():
        try:
            ws.row_dimensions[int(row) + off].height = float(height)
        except (TypeError, ValueError):
            pass


def _write_pivot(ws, sdef, tables, pctx, start_row, border, header_font,
                 label_font, center, PatternFill, get_column_letter, autosize):
    """Calcule et écrit un tableau croisé à partir d'un onglet table source."""
    pivot = sdef.get("pivot", {})
    src = tables.get(pivot.get("source"))
    if not src:
        ws.cell(row=start_row, column=1,
                value="Source du tableau croisé introuvable.").font = label_font
        return

    cols = src["columns"]
    rows = src["rows"]
    key_index = {c.get("key", c.get("label")): i for i, c in enumerate(cols)}
    label_index = {c.get("label"): i for i, c in enumerate(cols)}

    def idx(field):
        if field in key_index:
            return key_index[field]
        return label_index.get(field)

    ri = idx(pivot.get("row_field"))
    ci = idx(pivot.get("col_field"))
    vi = idx(pivot.get("value_field"))
    agg = pivot.get("agg", "sum")

    if ri is None or vi is None:
        ws.cell(row=start_row, column=1,
                value="Champs du tableau croisé mal configurés.").font = label_font
        return

    # Catégories
    row_cats, col_cats = [], []
    for row in rows:
        rv = "" if row[ri] is None else str(row[ri])
        if rv not in row_cats:
            row_cats.append(rv)
        if ci is not None:
            cv = "" if row[ci] is None else str(row[ci])
            if cv not in col_cats:
                col_cats.append(cv)
    row_cats.sort()
    col_cats.sort()
    if ci is None:
        col_cats = ["Valeur"]

    # Agrégation
    buckets = {}
    for row in rows:
        rv = "" if row[ri] is None else str(row[ri])
        cv = ("Valeur" if ci is None else
              ("" if row[ci] is None else str(row[ci])))
        num = row[vi]
        if not isinstance(num, (int, float)):
            try:
                num = float(str(num).replace(",", "."))
            except (ValueError, AttributeError):
                num = 0
        buckets.setdefault((rv, cv), []).append(num)

    def aggregate(vals):
        if not vals:
            return None
        if agg == "count":
            return len(vals)
        if agg == "avg":
            return sum(vals) / len(vals)
        if agg == "max":
            return max(vals)
        if agg == "min":
            return min(vals)
        return sum(vals)

    value_fmt = _fmt({"type": pivot.get("value_type", "decimal"),
                      "symbol": pivot.get("symbol", "€"),
                      "decimals": pivot.get("decimals", 2)})

    r0 = start_row
    # Coin + en-têtes de colonnes
    corner = cols[ri].get("label", pivot.get("row_field"))
    hc = ws.cell(row=r0, column=1, value=corner)
    hc.fill = PatternFill("solid", fgColor="1F497D"); hc.font = header_font
    hc.alignment = center; hc.border = border
    for j, cc in enumerate(col_cats, start=2):
        cell = ws.cell(row=r0, column=j, value=cc)
        cell.fill = PatternFill("solid", fgColor="4472C4"); cell.font = header_font
        cell.alignment = center; cell.border = border
    total_col = 2 + len(col_cats)
    tcell = ws.cell(row=r0, column=total_col, value="Total")
    tcell.fill = PatternFill("solid", fgColor="1F497D"); tcell.font = header_font
    tcell.alignment = center; tcell.border = border

    # Lignes
    col_totals = [0] * len(col_cats)
    grand = 0
    for i, rc in enumerate(row_cats, start=1):
        rr = r0 + i
        lc = ws.cell(row=rr, column=1, value=rc); lc.font = label_font
        lc.border = border
        row_total = 0
        for j, cc in enumerate(col_cats):
            val = aggregate(buckets.get((rc, cc), []))
            cell = ws.cell(row=rr, column=2 + j, value=val)
            cell.border = border
            if value_fmt:
                cell.number_format = value_fmt
            if isinstance(val, (int, float)):
                row_total += val
                col_totals[j] += val
        tc = ws.cell(row=rr, column=total_col, value=row_total)
        tc.font = label_font; tc.border = border
        if value_fmt:
            tc.number_format = value_fmt
        grand += row_total

    # Ligne de total général
    rr = r0 + len(row_cats) + 1
    ws.cell(row=rr, column=1, value="Total").font = label_font
    ws.cell(row=rr, column=1).border = border
    for j, ct in enumerate(col_totals):
        cell = ws.cell(row=rr, column=2 + j, value=ct)
        cell.font = label_font; cell.border = border
        if value_fmt:
            cell.number_format = value_fmt
    gc = ws.cell(row=rr, column=total_col, value=grand)
    gc.font = label_font; gc.border = border
    if value_fmt:
        gc.number_format = value_fmt

    ws.freeze_panes = ws.cell(row=r0 + 1, column=2)
    autosize(ws, total_col, minw=12)
