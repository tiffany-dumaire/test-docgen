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
          <button class="mini" (click)="addSheet('grid')">Grille</button>
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
                <input [(ngModel)]="c.formula" placeholder="= formule {autre_col}" style="width:150px" title="Formule (ex : ={qte}*{pu})" />
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

            <h4>Mises en forme conditionnelles <span class="hint">(colorer selon la valeur)</span></h4>
            @for (cf of s.conditional_formats ?? []; track $index) {
              <div class="line">
                <select [(ngModel)]="cf.column" style="flex:1">
                  @for (c of s.columns ?? []; track c.key) { <option [value]="c.key">{{ c.label }}</option> }
                </select>
                <select [(ngModel)]="cf.kind" style="width:130px">
                  <option value="cellis">Condition</option>
                  <option value="color_scale">Échelle couleurs</option>
                  <option value="data_bar">Barres</option>
                </select>
                @if ((cf.kind ?? 'cellis') === 'cellis') {
                  <select [(ngModel)]="cf.op" style="width:70px">
                    <option value=">">&gt;</option><option value=">=">&ge;</option>
                    <option value="<">&lt;</option><option value="<=">&le;</option>
                    <option value="==">=</option><option value="!=">&ne;</option>
                    <option value="between">entre</option>
                  </select>
                  <input [(ngModel)]="cf.value" placeholder="valeur" style="width:70px" />
                  @if (cf.op === 'between') { <input [(ngModel)]="cf.value2" placeholder="et" style="width:70px" /> }
                  <input type="color" [ngModel]="'#' + (cf.fill || 'FFC7CE')" (ngModelChange)="cf.fill = $event.slice(1)" title="Couleur de fond" />
                }
                <button class="mini del" (click)="s.conditional_formats!.splice($index, 1)">✕</button>
              </div>
            }
            <button class="btn-sm" (click)="addCF(s)">+ Règle</button>

            <h4>Validations <span class="hint">(liste déroulante, plage)</span></h4>
            @for (v of s.validations ?? []; track $index) {
              <div class="line">
                <select [(ngModel)]="v.column" style="flex:1">
                  @for (c of s.columns ?? []; track c.key) { <option [value]="c.key">{{ c.label }}</option> }
                </select>
                <select [(ngModel)]="v.kind" style="width:120px">
                  <option value="list">Liste</option><option value="whole">Entier</option>
                  <option value="decimal">Décimal</option><option value="date">Date</option>
                </select>
                @if (v.kind === 'list') {
                  <input [ngModel]="(v.options ?? []).join(', ')" (ngModelChange)="v.options = splitList($event)" placeholder="Option1, Option2, …" style="flex:2" />
                } @else {
                  <select [(ngModel)]="v.op" style="width:80px">
                    <option value="between">entre</option><option value="greaterThan">&gt;</option><option value="lessThan">&lt;</option>
                  </select>
                  <input [(ngModel)]="v.value" placeholder="min" style="width:70px" />
                  <input [(ngModel)]="v.value2" placeholder="max" style="width:70px" />
                }
                <button class="mini del" (click)="s.validations!.splice($index, 1)">✕</button>
              </div>
            }
            <button class="btn-sm" (click)="addValidation(s)">+ Validation</button>
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

          @if (s.type === 'grid') {
            <h4>Grille — aperçu et édition en temps réel</h4>
            <p class="hint">Cliquez une cellule pour la modifier ; la barre d'outils applique le style. Variables {{ '{{' }}…{{ '}}' }} acceptées.</p>

            <!-- Barre d'outils de la cellule sélectionnée -->
            @if (sel(s); as cl) {
              <div class="gtoolbar">
                <span class="gt-ref">{{ colLabel(gsel()!.c) }}{{ gsel()!.r }}</span>
                <button class="gt" [class.on]="cl.bold" (click)="cl.bold = !cl.bold; touch()" title="Gras"><b>G</b></button>
                <button class="gt" [class.on]="cl.italic" (click)="cl.italic = !cl.italic; touch()" title="Italique"><i>I</i></button>
                <button class="gt" [class.on]="cl.underline" (click)="cl.underline = !cl.underline; touch()" title="Souligné"><u>S</u></button>
                <span class="gt-sep"></span>
                <button class="gt" [class.on]="(cl.align||'left')==='left'" (click)="cl.align='left'; touch()">⯇</button>
                <button class="gt" [class.on]="cl.align==='center'" (click)="cl.align='center'; touch()">≡</button>
                <button class="gt" [class.on]="cl.align==='right'" (click)="cl.align='right'; touch()">⯈</button>
                <span class="gt-sep"></span>
                <label class="gt-col" title="Couleur du texte">A<input type="color" [ngModel]="cl.color || '#1d1e1b'" (ngModelChange)="cl.color = $event; touch()" /></label>
                <label class="gt-col" title="Couleur de fond">▮<input type="color" [ngModel]="cl.bg || '#ffffff'" (ngModelChange)="cl.bg = $event; touch()" /></label>
                <span class="gt-sep"></span>
                <label class="chk"><input type="checkbox" [ngModel]="cl.border !== false" (ngModelChange)="cl.border = $event; touch()" /> Bord</label>
                <label class="chk"><input type="checkbox" [(ngModel)]="cl.wrap" (ngModelChange)="touch()" /> Retour</label>
                <span class="span">Taille</span><input type="number" min="6" max="48" [ngModel]="cl.size || 11" (ngModelChange)="cl.size = +$event; touch()" style="width:52px" />
                <span class="span">Fusion</span>
                <input type="number" min="1" [ngModel]="cl.row_span || 1" (ngModelChange)="setSpan(cl,'row_span',$event)" style="width:44px" title="Lignes" />×<input type="number" min="1" [ngModel]="cl.col_span || 1" (ngModelChange)="setSpan(cl,'col_span',$event)" style="width:44px" title="Colonnes" />
                <input [ngModel]="cl.number_format" (ngModelChange)="cl.number_format=$event; touch()" placeholder="Format (#,##0.00)" style="width:150px" />
              </div>
            } @else { <div class="gtoolbar muted">Sélectionnez une cellule pour la styliser.</div> }

            <div class="gwrap">
              <table class="gtable">
                <thead>
                  <tr>
                    <th class="ghdr corner"></th>
                    @for (c of colRange(s); track c) {
                      <th class="ghdr" [style.width.px]="colW(s,c)">
                        <div class="ghlbl">{{ colLabel(c) }}<button class="ghx" (click)="delCol(s,c)" title="Supprimer la colonne">✕</button></div>
                        <input class="ghsize" type="number" min="3" [ngModel]="rawColW(s,c)" (ngModelChange)="setColW(s,c,$event)" title="Largeur" />
                      </th>
                    }
                    <th class="ghdr addcol"><button class="mini" (click)="addCol(s)" title="Ajouter une colonne">＋</button></th>
                  </tr>
                </thead>
                <tbody>
                  @for (r of rowRange(s); track r) {
                    <tr>
                      <th class="ghdr rownum">
                        <div>{{ r }}<button class="ghx" (click)="delRow(s,r)" title="Supprimer la ligne">✕</button></div>
                        <input class="ghsize" type="number" min="8" [ngModel]="rawRowH(s,r)" (ngModelChange)="setRowH(s,r,$event)" title="Hauteur" />
                      </th>
                      @for (c of colRange(s); track c) {
                        @if (!covered(s,r,c)) {
                          <td class="gcellx" [class.selected]="isSel(r,c)"
                              [attr.colspan]="spanC(s,r,c)" [attr.rowspan]="spanR(s,r,c)"
                              [style.background]="bgOf(s,r,c)" [style.border]="borderOf(s,r,c)"
                              (click)="selectCell(s,r,c)">
                            <input class="gin"
                              [style.color]="colorOf(s,r,c)" [style.font-weight]="boldOf(s,r,c)"
                              [style.font-style]="italicOf(s,r,c)" [style.text-align]="alignOf(s,r,c)"
                              [style.font-size.px]="sizeOf(s,r,c)"
                              [ngModel]="valOf(s,r,c)" (ngModelChange)="setVal(s,r,c,$event)"
                              (focus)="selectCell(s,r,c)" />
                          </td>
                        }
                      }
                      <td class="gpad"></td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
            <div class="line" style="margin-top:.4rem;gap:.5rem">
              <button class="btn-sm" (click)="addRow(s)">＋ Ligne</button>
              <button class="btn-sm" (click)="addCol(s)">＋ Colonne</button>
              <span class="hint">{{ (s.cells?.length || 0) }} cellule(s) définie(s)</span>
            </div>

            <h4>Images / logo <span class="hint">(position et taille libres)</span></h4>
            <p class="hint">Ancrée à une cellule (ligne/colonne), avec largeur/hauteur en pixels et décalage fin. Laissez une seule dimension pour conserver les proportions.</p>
            <div class="gridcells">
              @for (im of s.images ?? []; track $index) {
                <div class="gcell">
                  <div class="line">
                    <select [ngModel]="im.source || 'company'" (ngModelChange)="im.source = $event" title="Source de l'image">
                      <option value="company">Logo entreprise</option>
                      <option value="url">Image (URL média)</option>
                    </select>
                    @if (im.source === 'url') {
                      <input [(ngModel)]="im.url" placeholder="/media/…" style="flex:2" />
                    }
                    <button class="mini del" (click)="s.images!.splice($index, 1)">✕</button>
                  </div>
                  <div class="line">
                    <span class="span">Ancrage L</span><input type="number" min="1" [ngModel]="im.row" (ngModelChange)="im.row = +$event" style="width:56px" />
                    <span class="span">C</span><input type="number" min="1" [ngModel]="im.col" (ngModelChange)="im.col = +$event" style="width:56px" />
                    <span class="span">Largeur px</span><input type="number" min="0" [ngModel]="im.width" (ngModelChange)="im.width = +$event || undefined" style="width:70px" />
                    <span class="span">Hauteur px</span><input type="number" min="0" [ngModel]="im.height" (ngModelChange)="im.height = +$event || undefined" style="width:70px" />
                  </div>
                  <div class="line">
                    <span class="span">Décalage X px</span><input type="number" [ngModel]="im.offset_x || 0" (ngModelChange)="im.offset_x = +$event" style="width:70px" />
                    <span class="span">Y px</span><input type="number" [ngModel]="im.offset_y || 0" (ngModelChange)="im.offset_y = +$event" style="width:70px" />
                  </div>
                </div>
              }
            </div>
            <button class="btn-sm" (click)="addImage(s)">+ Image / logo</button>
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
    .gridcells { display:flex; flex-direction:column; gap:.5rem; }
    .gcell { border:1px solid var(--border); border-radius:8px; padding:.5rem .6rem; background:var(--surface,#fff); }
    .gcell .line { margin-bottom:.3rem; flex-wrap:wrap; }
    .gcell input[type=color] { width:38px; height:30px; padding:2px; }
    /* Éditeur tableur */
    .gtoolbar { display:flex; flex-wrap:wrap; align-items:center; gap:.3rem; padding:.4rem .5rem; border:1px solid var(--border);
      border-radius:8px; background:var(--surface,#fff); margin-bottom:.4rem; position:sticky; top:0; z-index:2; }
    .gt-ref { font-weight:700; font-family:ui-monospace,monospace; min-width:38px; color:var(--primary); }
    .gt { border:1px solid var(--border); background:#fff; border-radius:6px; min-width:28px; height:28px; cursor:pointer; font-size:.85rem; color:var(--text); }
    .gt.on { background:var(--primary); color:#fff; border-color:var(--primary); }
    .gt-sep { width:1px; height:20px; background:var(--border); margin:0 .2rem; }
    .gt-col { display:inline-flex; align-items:center; gap:.15rem; border:1px solid var(--border); border-radius:6px; padding:0 .25rem; height:28px; font-size:.8rem; cursor:pointer; }
    .gt-col input[type=color] { width:22px; height:20px; padding:0; border:none; background:none; }
    .gwrap { overflow:auto; border:1px solid var(--border); border-radius:10px; max-height:520px; }
    table.gtable { border-collapse:separate; border-spacing:0; }
    .gtable th.ghdr { background:var(--mat-sys-surface-container-high); position:sticky; top:0; z-index:1; padding:2px; text-align:center;
      font-size:.68rem; color:var(--muted); border:1px solid var(--border); min-width:64px; }
    .gtable th.rownum { position:sticky; left:0; z-index:1; min-width:40px; }
    .gtable th.corner { position:sticky; left:0; top:0; z-index:3; min-width:40px; }
    .ghlbl { display:flex; align-items:center; justify-content:center; gap:.15rem; font-weight:700; color:var(--text); }
    .ghx { border:none; background:none; color:var(--muted); cursor:pointer; font-size:.6rem; opacity:0; }
    th.ghdr:hover .ghx { opacity:.7; } .ghx:hover { color:var(--danger); }
    .ghsize { width:100%; border:none; background:transparent; font-size:.62rem; text-align:center; color:var(--muted); padding:0; }
    .gtable th.addcol .mini { min-width:24px; }
    td.gcellx { padding:0; min-width:64px; cursor:cell; }
    td.gcellx.selected { outline:2px solid var(--primary); outline-offset:-2px; }
    .gin { width:100%; min-width:64px; height:26px; border:none; background:transparent; padding:2px 5px; font:inherit; color:inherit; }
    .gin:focus { outline:none; }
    td.gpad, .gpad { border:none; background:transparent; }
  `],
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
