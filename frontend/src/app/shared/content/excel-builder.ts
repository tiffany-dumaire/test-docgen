import { Component, Input, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  CellType,
  ExcelColumn,
  ExcelSheet,
  GridCell,
  SheetImage,
  SheetType,
} from '@core/models';

const DEFAULT_COL_W = 12;   // largeur Excel par défaut (~caractères)
const DEFAULT_ROW_H = 18;   // hauteur par défaut (points)

const CELL_TYPES: { value: CellType; label: string }[] = [
  { value: 'text', label: 'Texte' },
  { value: 'integer', label: 'Nombre entier' },
  { value: 'decimal', label: 'Nombre à virgule' },
  { value: 'currency', label: 'Monnaie' },
  { value: 'percent', label: 'Pourcentage' },
  { value: 'date', label: 'Date' },
];

@Component({
  selector: 'app-excel-builder',
  imports: [FormsModule],
  templateUrl: './excel-builder.html',
  styleUrl: './excel-builder.scss',
})
export class ExcelBuilder {
  @Input({ required: true }) sheets!: ExcelSheet[];
  cellTypes = CELL_TYPES;
  active = signal(0);
  private seq = 0;

  current = computed(() => this.sheets[this.active()]);

  icon(t: SheetType) { return t === 'table' ? '▦' : t === 'pivot' ? '⊞' : t === 'grid' ? '▧' : 'ℹ'; }
  typeLabel(t: SheetType) {
    return t === 'table' ? 'Tableau à colonnes' : t === 'pivot' ? 'Tableau croisé'
      : t === 'grid' ? 'Grille libre' : 'Informations fixes';
  }

  tableSheets = computed(() => this.sheets.filter((s) => s.type === 'table'));
  sourceCols(s: ExcelSheet): ExcelColumn[] {
    const src = this.sheets.find((x) => x.id === s.pivot?.source);
    return src?.columns ?? [];
  }

  private uid(prefix: string) { return `${prefix}${Date.now()}_${this.seq++}`; }

  addSheet(type: SheetType) {
    const base: ExcelSheet = { id: this.uid('sh'), name: this.defaultName(type), type };
    if (type === 'table') {
      base.groups = [];
      base.columns = [
        { key: 'col1', label: 'Colonne 1', type: 'text' },
        { key: 'col2', label: 'Colonne 2', type: 'text' },
      ];
      base.show_totals = false; base.allow_add_rows = true; base.allow_add_columns = false;
    } else if (type === 'pivot') {
      const src = this.tableSheets()[0];
      base.pivot = {
        source: src?.id ?? '', row_field: '', col_field: '', value_field: '',
        agg: 'sum', value_type: 'decimal',
      };
    } else if (type === 'grid') {
      base.cells = [
        { row: 1, col: 1, value: '{{document_title}}', bold: true, bg: '#EC6608', color: '#FFFFFF', align: 'center', size: 14, col_span: 3, border: true },
        { row: 2, col: 1, value: 'Libellé', bold: true, bg: '#F5F3EF', border: true },
        { row: 2, col: 2, value: 'Valeur', bold: true, bg: '#F5F3EF', border: true },
      ];
      base.col_widths = { '1': 24, '2': 20, '3': 20 };
      base.row_heights = { '1': 26 };
    } else {
      base.items = [{ label: 'Date', type: 'date', value: '{{today}}' }];
    }
    this.sheets.push(base);
    this.active.set(this.sheets.length - 1);
  }

  private defaultName(t: SheetType) {
    const n = this.sheets.length + 1;
    return t === 'pivot' ? 'Synthèse' : t === 'info' ? 'Informations'
      : t === 'grid' ? 'Grille' : `Onglet ${n}`;
  }

  addCell(s: ExcelSheet) {
    s.cells = s.cells ?? [];
    const last = s.cells[s.cells.length - 1];
    s.cells.push({ row: last ? last.row + 1 : 1, col: 1, value: '', border: true });
  }

  // ===== Éditeur « grille » type tableur (aperçu + édition en temps réel) =====
  gsel = signal<{ r: number; c: number } | null>(null);
  touch() { /* les objets sont mutés en place ; CD zone déclenche le rendu */ }

  private maxUsed(s: ExcelSheet) {
    let mr = 0, mc = 0;
    for (const cl of s.cells ?? []) {
      mr = Math.max(mr, (cl.row || 1) + (cl.row_span || 1) - 1);
      mc = Math.max(mc, (cl.col || 1) + (cl.col_span || 1) - 1);
    }
    for (const k of Object.keys(s.col_widths ?? {})) mc = Math.max(mc, +k || 0);
    for (const k of Object.keys(s.row_heights ?? {})) mr = Math.max(mr, +k || 0);
    return { mr, mc };
  }
  gridRows(s: ExcelSheet): number {
    const { mr } = this.maxUsed(s);
    return Math.max((s as any).grid_rows || 0, mr, 8);
  }
  gridCols(s: ExcelSheet): number {
    const { mc } = this.maxUsed(s);
    return Math.max((s as any).grid_cols || 0, mc, 6);
  }
  rowRange(s: ExcelSheet): number[] { return Array.from({ length: this.gridRows(s) }, (_, i) => i + 1); }
  colRange(s: ExcelSheet): number[] { return Array.from({ length: this.gridCols(s) }, (_, i) => i + 1); }
  addRow(s: ExcelSheet) { (s as any).grid_rows = this.gridRows(s) + 1; this.touch(); }
  addCol(s: ExcelSheet) { (s as any).grid_cols = this.gridCols(s) + 1; this.touch(); }

  colLabel(c: number): string {
    let n = c, out = '';
    while (n > 0) { const m = (n - 1) % 26; out = String.fromCharCode(65 + m) + out; n = Math.floor((n - 1) / 26); }
    return out || 'A';
  }

  private find(s: ExcelSheet, r: number, c: number): GridCell | undefined {
    return (s.cells ?? []).find((x) => x.row === r && x.col === c);
  }
  private ensure(s: ExcelSheet, r: number, c: number): GridCell {
    s.cells = s.cells ?? [];
    let cl = this.find(s, r, c);
    if (!cl) { cl = { row: r, col: c, value: '', border: true }; s.cells.push(cl); }
    return cl;
  }
  /** Une cellule est-elle couverte par une fusion (donc non affichée) ? */
  covered(s: ExcelSheet, r: number, c: number): boolean {
    for (const cl of s.cells ?? []) {
      const rs = cl.row_span || 1, cs = cl.col_span || 1;
      if (rs === 1 && cs === 1) continue;
      if (r >= cl.row && r < cl.row + rs && c >= cl.col && c < cl.col + cs && !(r === cl.row && c === cl.col)) return true;
    }
    return false;
  }
  spanR(s: ExcelSheet, r: number, c: number) { return this.find(s, r, c)?.row_span || 1; }
  spanC(s: ExcelSheet, r: number, c: number) { return this.find(s, r, c)?.col_span || 1; }

  selectCell(s: ExcelSheet, r: number, c: number) { this.gsel.set({ r, c }); }
  isSel(r: number, c: number) { const g = this.gsel(); return !!g && g.r === r && g.c === c; }
  sel(s: ExcelSheet): GridCell | null {
    const g = this.gsel(); if (!g) return null;
    return this.ensure(s, g.r, g.c);
  }
  setSpan(cl: GridCell, key: 'row_span' | 'col_span', v: unknown) {
    cl[key] = Math.max(1, +(v as number) || 1); this.touch();
  }
  setVal(s: ExcelSheet, r: number, c: number, v: string) {
    const cl = this.find(s, r, c);
    if (!cl && !v) return;                 // ne crée rien pour une cellule vide
    this.ensure(s, r, c).value = v; this.touch();
  }
  valOf(s: ExcelSheet, r: number, c: number) { return this.find(s, r, c)?.value ?? ''; }

  // Getters de style pour l'aperçu WYSIWYG
  bgOf(s: ExcelSheet, r: number, c: number) { return this.find(s, r, c)?.bg || 'transparent'; }
  colorOf(s: ExcelSheet, r: number, c: number) { return this.find(s, r, c)?.color || 'inherit'; }
  boldOf(s: ExcelSheet, r: number, c: number) { return this.find(s, r, c)?.bold ? '700' : '400'; }
  italicOf(s: ExcelSheet, r: number, c: number) { return this.find(s, r, c)?.italic ? 'italic' : 'normal'; }
  alignOf(s: ExcelSheet, r: number, c: number) { return this.find(s, r, c)?.align || 'left'; }
  sizeOf(s: ExcelSheet, r: number, c: number) { return (this.find(s, r, c)?.size || 11) + 2; }
  borderOf(s: ExcelSheet, r: number, c: number) {
    const cl = this.find(s, r, c);
    return (cl && cl.border !== false) ? '1px solid var(--border-strong)' : '1px solid var(--border)';
  }

  // Tailles de colonnes / lignes
  rawColW(s: ExcelSheet, c: number) { return s.col_widths?.[String(c)]; }
  rawRowH(s: ExcelSheet, r: number) { return s.row_heights?.[String(r)]; }
  colW(s: ExcelSheet, c: number) { return Math.round((this.rawColW(s, c) || DEFAULT_COL_W) * 7) + 6; }
  setColW(s: ExcelSheet, c: number, v: unknown) {
    s.col_widths = s.col_widths ?? {};
    const n = +(v as number); if (n > 0) s.col_widths[String(c)] = n; else delete s.col_widths[String(c)];
    this.touch();
  }
  setRowH(s: ExcelSheet, r: number, v: unknown) {
    s.row_heights = s.row_heights ?? {};
    const n = +(v as number); if (n > 0) s.row_heights[String(r)] = n; else delete s.row_heights[String(r)];
    this.touch();
  }

  delRow(s: ExcelSheet, r: number) {
    s.cells = (s.cells ?? []).filter((x) => x.row !== r);
    for (const cl of s.cells) if (cl.row > r) cl.row -= 1;
    s.col_widths = s.col_widths; // inchangé
    s.row_heights = this.shiftDims(s.row_heights, r);
    if ((s as any).grid_rows) (s as any).grid_rows = Math.max(1, (s as any).grid_rows - 1);
    this.gsel.set(null); this.touch();
  }
  delCol(s: ExcelSheet, c: number) {
    s.cells = (s.cells ?? []).filter((x) => x.col !== c);
    for (const cl of s.cells) if (cl.col > c) cl.col -= 1;
    s.col_widths = this.shiftDims(s.col_widths, c);
    if ((s as any).grid_cols) (s as any).grid_cols = Math.max(1, (s as any).grid_cols - 1);
    this.gsel.set(null); this.touch();
  }
  private shiftDims(d: Record<string, number> | undefined, removed: number): Record<string, number> {
    const out: Record<string, number> = {};
    for (const [k, v] of Object.entries(d ?? {})) {
      const n = +k;
      if (n === removed) continue;
      out[String(n > removed ? n - 1 : n)] = v;
    }
    return out;
  }
  addImage(s: ExcelSheet) {
    s.images = s.images ?? [];
    const img: SheetImage = { source: 'company', col: 1, row: 1, width: 160, offset_x: 0, offset_y: 0 };
    s.images.push(img);
  }
  /** { "1": 24, "2": 30 } -> "1:24, 2:30" et inversement. */
  dimsToStr(d?: Record<string, number>): string {
    return Object.entries(d ?? {}).map(([k, v]) => `${k}:${v}`).join(', ');
  }
  strToDims(raw: string): Record<string, number> {
    const out: Record<string, number> = {};
    for (const part of (raw || '').split(',')) {
      const m = part.split(':');
      if (m.length === 2) {
        const k = m[0].trim(); const v = parseFloat(m[1]);
        if (k && !isNaN(v)) out[k] = v;
      }
    }
    return out;
  }

  removeSheet() {
    this.sheets.splice(this.active(), 1);
    this.active.set(Math.max(0, this.active() - 1));
  }
  move(dir: number) {
    const i = this.active(); const j = i + dir;
    if (j < 0 || j >= this.sheets.length) return;
    [this.sheets[i], this.sheets[j]] = [this.sheets[j], this.sheets[i]];
    this.active.set(j);
  }

  addGroup(s: ExcelSheet) { s.groups = s.groups ?? []; s.groups.push({ label: '', span: 1 }); }
  addColumn(s: ExcelSheet) {
    s.columns = s.columns ?? [];
    const n = s.columns.length + 1;
    s.columns.push({ key: `col${n}`, label: `Colonne ${n}`, type: 'text' });
  }
  moveCol(s: ExcelSheet, i: number, dir: number) {
    const arr = s.columns!; const j = i + dir;
    if (j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  addItem(s: ExcelSheet) {
    s.items = s.items ?? [];
    s.items.push({ label: '', type: 'text', value: '' });
  }
  addCF(s: ExcelSheet) {
    s.conditional_formats = s.conditional_formats ?? [];
    const first = (s.columns ?? [])[0];
    s.conditional_formats.push({
      column: first?.key ?? '', kind: 'cellis', op: '>', value: 0, fill: 'FFC7CE', font: '9C0006',
    });
  }
  addValidation(s: ExcelSheet) {
    s.validations = s.validations ?? [];
    const first = (s.columns ?? [])[0];
    s.validations.push({ column: first?.key ?? '', kind: 'list', options: [] });
  }
  splitList(raw: string): string[] {
    return raw.split(',').map((x) => x.trim()).filter(Boolean);
  }
  syncKey(c: ExcelColumn) {
    if (!c.key || /^col\d+$/.test(c.key)) {
      c.key = (c.label || '').toLowerCase().normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '') || c.key;
    }
  }
}
