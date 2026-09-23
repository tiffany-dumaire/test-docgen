import { Component, Input, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  CellType,
  ExcelColumn,
  ExcelSheet,
  SheetType,
} from '../../core/models';

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
  template: `
    <div class="xls">
      <!-- Onglets -->
      <div class="tabs">
        @for (s of sheets; track s.id; let i = $index) {
          <button class="tab" [class.active]="active() === i" (click)="active.set(i)">
            <span class="ico">{{ icon(s.type) }}</span> {{ s.name || 'Onglet' }}
          </button>
        }
        <div class="add">
          <span class="lbl">+ Onglet :</span>
          <button class="mini" (click)="addSheet('table')">Table</button>
          <button class="mini" (click)="addSheet('pivot')">Croisé</button>
          <button class="mini" (click)="addSheet('info')">Infos</button>
        </div>
      </div>

      @if (current(); as s) {
        <div class="sheet card">
          <!-- Barre d'onglet -->
          <div class="sheet-head">
            <div class="field"><label>Nom de l'onglet</label>
              <input [(ngModel)]="s.name" /></div>
            <div class="field"><label>Titre affiché (facultatif)</label>
              <input [(ngModel)]="s.title" placeholder="{{ '{{' }}document_title{{ '}}' }}" /></div>
            <div class="sheet-actions">
              <button class="mini" (click)="move(-1)" [disabled]="active() === 0">◀</button>
              <button class="mini" (click)="move(1)" [disabled]="active() === sheets.length - 1">▶</button>
              <button class="mini del" (click)="removeSheet()">Supprimer</button>
            </div>
          </div>
          <div class="type-badge">Type : <b>{{ typeLabel(s.type) }}</b></div>

          <!-- ===== TABLE ===== -->
          @if (s.type === 'table') {
            <h4>Regroupements d'en-têtes <span class="hint">(ligne 1, fusionnée)</span></h4>
            @for (g of s.groups ?? []; track $index) {
              <div class="line">
                <input [(ngModel)]="g.label" placeholder="Nom du groupe (ex : Entreprise)" style="flex:2" />
                <label class="span">colonnes
                  <input type="number" min="1" [ngModel]="g.span" (ngModelChange)="g.span = +$event" style="width:64px" />
                </label>
                <button class="mini del" (click)="s.groups!.splice($index, 1)">✕</button>
              </div>
            }
            <button class="btn-sm" (click)="addGroup(s)">+ Groupe</button>
            <p class="hint">La somme des colonnes des groupes doit couvrir vos colonnes ({{ (s.columns ?? []).length }}).</p>

            <h4>Colonnes <span class="hint">(ligne 2)</span></h4>
            @for (c of s.columns ?? []; track $index) {
              <div class="line">
                <input [(ngModel)]="c.label" (ngModelChange)="syncKey(c)" placeholder="Libellé" style="flex:2" />
                <select [(ngModel)]="c.type" style="flex:1">
                  @for (t of cellTypes; track t.value) { <option [value]="t.value">{{ t.label }}</option> }
                </select>
                @if (c.type === 'currency') {
                  <input [(ngModel)]="c.symbol" placeholder="€" style="width:52px" title="Symbole" />
                }
                @if (c.type === 'currency' || c.type === 'decimal') {
                  <input type="number" min="0" max="6" [ngModel]="c.decimals ?? 2" (ngModelChange)="c.decimals = +$event" style="width:56px" title="Décimales" />
                }
                <button class="mini" (click)="moveCol(s, $index, -1)" [disabled]="$index === 0">▲</button>
                <button class="mini" (click)="moveCol(s, $index, 1)" [disabled]="$index === (s.columns!.length - 1)">▼</button>
                <button class="mini del" (click)="s.columns!.splice($index, 1)">✕</button>
              </div>
            }
            <button class="btn-sm" (click)="addColumn(s)">+ Colonne</button>

            <div class="toggles">
              <label class="chk"><input type="checkbox" [(ngModel)]="s.show_totals" /> Ligne de totaux</label>
              <label class="chk"><input type="checkbox" [(ngModel)]="s.allow_add_rows" /> Lignes ajoutables au remplissage</label>
              <label class="chk"><input type="checkbox" [(ngModel)]="s.allow_add_columns" /> Colonnes ajoutables au remplissage</label>
            </div>
          }

          <!-- ===== PIVOT ===== -->
          @if (s.type === 'pivot') {
            @if (tableSheets().length === 0) {
              <p class="warn">Créez d'abord un onglet « Table » pour l'utiliser comme source.</p>
            } @else {
              <div class="grid2">
                <div class="field"><label>Onglet source</label>
                  <select [(ngModel)]="s.pivot!.source">
                    @for (t of tableSheets(); track t.id) { <option [value]="t.id">{{ t.name }}</option> }
                  </select>
                </div>
                <div class="field"><label>Agrégation</label>
                  <select [(ngModel)]="s.pivot!.agg">
                    <option value="sum">Somme</option><option value="count">Nombre</option>
                    <option value="avg">Moyenne</option><option value="min">Minimum</option><option value="max">Maximum</option>
                  </select>
                </div>
                <div class="field"><label>Lignes (regroupement)</label>
                  <select [(ngModel)]="s.pivot!.row_field">
                    @for (c of sourceCols(s); track c.key) { <option [value]="c.key">{{ c.label }}</option> }
                  </select>
                </div>
                <div class="field"><label>Colonnes (facultatif)</label>
                  <select [(ngModel)]="s.pivot!.col_field">
                    <option value="">— aucune —</option>
                    @for (c of sourceCols(s); track c.key) { <option [value]="c.key">{{ c.label }}</option> }
                  </select>
                </div>
                <div class="field"><label>Valeur à agréger</label>
                  <select [(ngModel)]="s.pivot!.value_field">
                    @for (c of sourceCols(s); track c.key) { <option [value]="c.key">{{ c.label }}</option> }
                  </select>
                </div>
                <div class="field"><label>Format des valeurs</label>
                  <select [(ngModel)]="s.pivot!.value_type">
                    @for (t of cellTypes; track t.value) { <option [value]="t.value">{{ t.label }}</option> }
                  </select>
                </div>
              </div>
              @if (s.pivot!.value_type === 'currency') {
                <div class="field" style="max-width:120px"><label>Symbole</label><input [(ngModel)]="s.pivot!.symbol" placeholder="€" /></div>
              }
            }
          }

          <!-- ===== INFO ===== -->
          @if (s.type === 'info') {
            <h4>Informations fixes</h4>
            @for (it of s.items ?? []; track $index) {
              <div class="line">
                <input [(ngModel)]="it.label" placeholder="Libellé (ex : Date d'édition)" style="flex:2" />
                <select [(ngModel)]="it.type" style="flex:1">
                  @for (t of cellTypes; track t.value) { <option [value]="t.value">{{ t.label }}</option> }
                </select>
                <input [(ngModel)]="it.value" placeholder="Valeur" style="flex:2" />
                @if (it.type === 'currency') { <input [(ngModel)]="it.symbol" placeholder="€" style="width:52px" /> }
                <button class="mini del" (click)="s.items!.splice($index, 1)">✕</button>
              </div>
            }
            <button class="btn-sm" (click)="addItem(s)">+ Information</button>
            <p class="hint">Astuce : utilisez des variables comme <code>{{ '{{' }}today{{ '}}' }}</code>, <code>{{ '{{' }}client_name{{ '}}' }}</code>.</p>
          }
        </div>
      } @else {
        <div class="empty">Aucun onglet. Ajoutez-en un ci-dessus.</div>
      }
    </div>
  `,
  styles: [`
    .tabs { display:flex; flex-wrap:wrap; gap:.4rem; align-items:center; margin-bottom:.6rem; }
    .tab { border:1px solid var(--border); background:#fff; border-radius:8px 8px 0 0; padding:.4rem .7rem; cursor:pointer; font-size:.85rem; font-weight:600; }
    .tab.active { background:var(--primary); color:#fff; border-color:var(--primary); }
    .tab .ico { margin-right:.3rem; }
    .add { display:flex; align-items:center; gap:.3rem; margin-left:auto; }
    .add .lbl { font-size:.8rem; color:var(--muted); }
    .sheet-head { display:grid; grid-template-columns:1fr 1fr auto; gap:.8rem; align-items:end; }
    .sheet-actions { display:flex; gap:.3rem; align-items:center; }
    .type-badge { font-size:.8rem; color:var(--muted); margin:.5rem 0 .2rem; }
    h4 { margin:1rem 0 .4rem; font-size:.95rem; }
    .hint { font-weight:400; color:var(--muted); font-size:.78rem; }
    .warn { color:var(--warn, #ea580c); font-size:.85rem; }
    .line { display:flex; gap:.4rem; align-items:center; margin-bottom:.35rem; }
    .line input, .line select { padding:.35rem .5rem; }
    .span { display:flex; align-items:center; gap:.3rem; font-size:.78rem; color:var(--muted); }
    .mini { border:1px solid var(--border); background:#fff; border-radius:6px; cursor:pointer; padding:.2rem .45rem; font-size:.75rem; color:var(--muted); }
    .mini:hover { background:var(--bg); } .mini:disabled { opacity:.35; }
    .mini.del:hover { background:#fee2e2; color:var(--danger); }
    .btn-sm { border:1px dashed var(--border); background:var(--bg); border-radius:7px; cursor:pointer; padding:.3rem .7rem; font-size:.8rem; font-weight:600; color:var(--primary); }
    .toggles { display:flex; flex-wrap:wrap; gap:1rem; margin-top:.8rem; }
    .chk { display:flex; align-items:center; gap:.35rem; font-size:.85rem; font-weight:500; }
    .chk input { width:auto; }
    .grid2 { display:grid; grid-template-columns:1fr 1fr; gap:.6rem 1rem; }
    @media (max-width:700px){ .grid2, .sheet-head { grid-template-columns:1fr; } }
    code { background:var(--bg); padding:.05rem .3rem; border-radius:4px; font-size:.8rem; }
    .empty { padding:1.5rem; text-align:center; color:var(--muted); border:2px dashed var(--border); border-radius:10px; }
  `],
})
export class ExcelBuilder {
  @Input({ required: true }) sheets!: ExcelSheet[];
  cellTypes = CELL_TYPES;
  active = signal(0);
  private seq = 0;

  current = computed(() => this.sheets[this.active()]);

  icon(t: SheetType) { return t === 'table' ? '▦' : t === 'pivot' ? '⊞' : 'ℹ'; }
  typeLabel(t: SheetType) {
    return t === 'table' ? 'Tableau à colonnes' : t === 'pivot' ? 'Tableau croisé' : 'Informations fixes';
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
    } else {
      base.items = [{ label: 'Date', type: 'date', value: '{{today}}' }];
    }
    this.sheets.push(base);
    this.active.set(this.sheets.length - 1);
  }

  private defaultName(t: SheetType) {
    const n = this.sheets.length + 1;
    return t === 'pivot' ? 'Synthèse' : t === 'info' ? 'Informations' : `Onglet ${n}`;
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
  syncKey(c: ExcelColumn) {
    if (!c.key || /^col\d+$/.test(c.key)) {
      c.key = (c.label || '').toLowerCase().normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '') || c.key;
    }
  }
}
