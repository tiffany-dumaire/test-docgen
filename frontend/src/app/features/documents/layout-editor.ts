import { Component, Input, signal, computed, HostListener } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TemplateSettings } from '../../core/models';

type LType = 'text' | 'image' | 'logo' | 'rect' | 'ellipse' | 'line';
interface LEl {
  id: string; type: LType; x: number; y: number; w: number; h: number;
  text?: string; font?: string; size?: number; bold?: boolean; italic?: boolean;
  color?: string; align?: 'left' | 'center' | 'right';
  asset_url?: string; fit?: 'contain' | 'stretch';
  fill?: string; stroke?: string; stroke_width?: number; radius?: number; width?: number;
}
interface LLayout { background?: string; elements: LEl[]; page_size?: string; orientation?: string; }

const PT_W = 595.2755;
const PT_H = 841.8898;
const DISP_W = 460;

@Component({
  selector: 'app-layout-editor',
  imports: [FormsModule],
  template: `
    <div class="le">
      @if (!single) {
      <div class="tabs">
        <button class="tab" [class.active]="page() === 'cover'" (click)="setPage('cover')">📄 Page de garde</button>
        <button class="tab" [class.active]="page() === 'suivi'" (click)="setPage('suivi')">📋 Page de suivi</button>
        <button class="tab" [class.active]="page() === 'page'" (click)="setPage('page')">🖼️ Page libre (A3/A4)</button>
        <label class="chk"><input type="checkbox" [ngModel]="enabled()" (ngModelChange)="toggle($event)" /> Activer la mise en page libre</label>
      </div>
      }

      @if (enabled()) {
        <div class="fmt">
          <label>Format
            <select [ngModel]="layout().page_size || 'a4'" (ngModelChange)="setSize($event)">
              <option value="a4">A4</option><option value="a3">A3</option>
            </select>
          </label>
          <label>Orientation
            <select [ngModel]="layout().orientation || 'portrait'" (ngModelChange)="setOrient($event)">
              <option value="portrait">Portrait</option><option value="landscape">Paysage</option>
            </select>
          </label>
        </div>
        <div class="work">
          <!-- Palette + canvas -->
          <div>
            <div class="palette">
              <span class="lbl">Ajouter :</span>
              <button (click)="add('text')">Texte</button>
              <button (click)="add('image')">Image</button>
              <button (click)="add('logo')">Logo</button>
              <button (click)="add('rect')">Rectangle</button>
              <button (click)="add('ellipse')">Ellipse</button>
              <button (click)="add('line')">Ligne</button>
            </div>
            <div class="canvas" [style.width.px]="dispW" [style.height.px]="dispH"
                 [style.background]="layout().background || '#ffffff'"
                 (pointerdown)="deselect($event)">
              @for (el of layout().elements; track el.id) {
                <div class="el" [class.sel]="selected() === el.id"
                     [style.left.px]="el.x * scale" [style.top.px]="el.y * scale"
                     [style.width.px]="el.w * scale" [style.height.px]="(el.type==='line'?2:el.h) * scale"
                     (pointerdown)="startDrag($event, el)">
                  @switch (el.type) {
                    @case ('rect') { <div class="fillbox" [style.background]="el.fill || '#1F497D'" [style.borderRadius.px]="(el.radius||0)*scale"></div> }
                    @case ('ellipse') { <div class="fillbox" [style.background]="el.fill || 'transparent'" [style.border]="'2px solid ' + (el.stroke || '#1F497D')" style="border-radius:50%"></div> }
                    @case ('line') { <div class="linebox" [style.background]="el.color || '#1F497D'"></div> }
                    @case ('image') { <div class="ph">🖼️ image</div> }
                    @case ('logo') { <div class="ph">🏢 logo</div> }
                    @default {
                      <div class="txt" [style.color]="el.color || '#000'" [style.fontSize.px]="(el.size||14)*scale"
                           [style.fontWeight]="el.bold ? 700 : 400" [style.textAlign]="el.align || 'left'"
                           [style.fontStyle]="el.italic ? 'italic' : 'normal'">{{ el.text || 'Texte' }}</div>
                    }
                  }
                  @if (selected() === el.id) {
                    <div class="rz" (pointerdown)="startResize($event, el)"></div>
                  }
                </div>
              }
            </div>
            <p class="hint">Format A4. Glissez pour déplacer, tirez le coin ▟ pour redimensionner.</p>
          </div>

          <!-- Propriétés -->
          <div class="props">
            @if (current(); as el) {
              <div class="row between"><h4>{{ typeLabel(el.type) }}</h4>
                <button class="del" (click)="remove(el)">Supprimer</button></div>
              <div class="g2">
                <label>X <input type="number" [ngModel]="round(el.x)" (ngModelChange)="el.x=+$event" /></label>
                <label>Y <input type="number" [ngModel]="round(el.y)" (ngModelChange)="el.y=+$event" /></label>
                <label>Largeur <input type="number" [ngModel]="round(el.w)" (ngModelChange)="el.w=+$event" /></label>
                @if (el.type !== 'line') { <label>Hauteur <input type="number" [ngModel]="round(el.h)" (ngModelChange)="el.h=+$event" /></label> }
              </div>

              @if (el.type === 'text') {
                <label class="f">Texte<textarea [(ngModel)]="el.text" rows="2"></textarea></label>
                <div class="g2">
                  <label>Police
                    <select [(ngModel)]="el.font">
                      <option value="title">Titre (Montserrat SB)</option>
                      <option value="subtitle">Sous-titre (Montserrat)</option>
                      <option value="heading">Intertitre (Montserrat SB)</option>
                      <option value="body">Corps (Roboto)</option>
                      <option value="light">Léger (Montserrat Light)</option>
                    </select>
                  </label>
                  <label>Taille <input type="number" [ngModel]="el.size||14" (ngModelChange)="el.size=+$event" /></label>
                  <label>Couleur <input type="color" [ngModel]="el.color||'#000000'" (ngModelChange)="el.color=$event" /></label>
                  <label>Alignement
                    <select [(ngModel)]="el.align"><option value="left">Gauche</option><option value="center">Centre</option><option value="right">Droite</option></select>
                  </label>
                </div>
                <label class="chk2"><input type="checkbox" [(ngModel)]="el.bold" /> Gras</label>
                <label class="chk2"><input type="checkbox" [(ngModel)]="el.italic" /> Italique</label>
                <div class="vars"><span class="lbl">Variables :</span>
                  @for (v of variables; track v) { <button (click)="insertVar(el, v)">{{ '{{' }}{{ v }}{{ '}}' }}</button> }
                </div>
              }
              @if (el.type === 'image') {
                <label class="f">Image
                  <input type="file" accept="image/*" (change)="upload($event, el)" />
                </label>
                @if (el.asset_url) { <div class="tag">Image chargée ✓</div> }
              }
              @if (el.type === 'logo') { <div class="tag">Le logo de l'entreprise sera inséré et redimensionné.</div> }
              @if (el.type === 'rect') {
                <div class="g2">
                  <label>Remplissage <input type="color" [ngModel]="el.fill||'#1F497D'" (ngModelChange)="el.fill=$event" /></label>
                  <label>Coins <input type="number" [ngModel]="el.radius||0" (ngModelChange)="el.radius=+$event" /></label>
                  <label>Bordure <input type="color" [ngModel]="el.stroke||'#1F497D'" (ngModelChange)="el.stroke=$event" /></label>
                  <label>Épaisseur bord. <input type="number" [ngModel]="el.stroke_width||0" (ngModelChange)="el.stroke_width=+$event" /></label>
                </div>
              }
              @if (el.type === 'ellipse') {
                <div class="g2">
                  <label>Remplissage <input type="color" [ngModel]="el.fill||'#ffffff'" (ngModelChange)="el.fill=$event" /></label>
                  <label>Bordure <input type="color" [ngModel]="el.stroke||'#1F497D'" (ngModelChange)="el.stroke=$event" /></label>
                  <label>Épaisseur bord. <input type="number" [ngModel]="el.stroke_width||2" (ngModelChange)="el.stroke_width=+$event" /></label>
                </div>
              }
              @if (el.type === 'line') {
                <div class="g2">
                  <label>Couleur <input type="color" [ngModel]="el.color||'#1F497D'" (ngModelChange)="el.color=$event" /></label>
                  <label>Épaisseur <input type="number" [ngModel]="el.width||2" (ngModelChange)="el.width=+$event" /></label>
                </div>
              }
            } @else {
              <p class="muted">Sélectionnez un élément, ou ajoutez-en un depuis la palette.</p>
              <label class="f">Fond de page <input type="color" [ngModel]="layout().background||'#ffffff'" (ngModelChange)="setBg($event)" /></label>
            }
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .fmt { display:flex; gap:1rem; margin:.2rem 0 .6rem; }
    .fmt label { display:flex; align-items:center; gap:.4rem; font-size:.82rem; font-weight:600; }
    .fmt select { width:auto; padding:.25rem .4rem; }
    .tabs { display:flex; gap:.4rem; align-items:center; margin-bottom:.6rem; flex-wrap:wrap; }
    .tab { border:1px solid var(--border); background:#fff; border-radius:8px; padding:.4rem .7rem; cursor:pointer; font-weight:600; font-size:.85rem; }
    .tab.active { background:var(--primary); color:#fff; border-color:var(--primary); }
    .chk, .chk2 { display:flex; align-items:center; gap:.35rem; font-size:.85rem; font-weight:500; }
    .chk { margin-left:auto; } .chk input, .chk2 input { width:auto; }
    .work { display:grid; grid-template-columns:auto 300px; gap:1rem; align-items:start; }
    @media(max-width:900px){ .work { grid-template-columns:1fr; } }
    .palette { display:flex; gap:.35rem; align-items:center; margin-bottom:.5rem; flex-wrap:wrap; }
    .palette .lbl { font-size:.8rem; color:var(--muted); }
    .palette button { border:1px solid var(--border); background:#fff; border-radius:7px; padding:.3rem .6rem; cursor:pointer; font-size:.8rem; }
    .palette button:hover { background:var(--primary-light); }
    .canvas { position:relative; border:1px solid var(--border); box-shadow:0 2px 10px rgba(0,0,0,.08); overflow:hidden; touch-action:none; }
    .el { position:absolute; box-sizing:border-box; cursor:move; }
    .el.sel { outline:2px solid var(--primary); }
    .fillbox, .linebox { width:100%; height:100%; }
    .linebox { align-self:center; }
    .ph { width:100%; height:100%; display:grid; place-items:center; background:#eef2f9; color:#64748b; font-size:.72rem; border:1px dashed #cbd5e1; }
    .txt { width:100%; height:100%; overflow:hidden; line-height:1.2; white-space:pre-wrap; }
    .rz { position:absolute; right:-5px; bottom:-5px; width:12px; height:12px; background:var(--primary); border:2px solid #fff; border-radius:2px; cursor:nwse-resize; }
    .hint { color:var(--muted); font-size:.78rem; margin:.4rem 0 0; }
    .props { border:1px solid var(--border); border-radius:10px; padding:.8rem; background:#fff; }
    .props h4 { margin:0 0 .5rem; }
    .props .del { border:1px solid var(--border); background:#fff; border-radius:6px; cursor:pointer; font-size:.72rem; padding:.2rem .5rem; color:var(--danger); }
    .g2 { display:grid; grid-template-columns:1fr 1fr; gap:.4rem; margin-bottom:.5rem; }
    .props label { font-size:.75rem; font-weight:600; display:flex; flex-direction:column; gap:.15rem; }
    .props .f { display:block; margin-bottom:.5rem; }
    .props input, .props select, .props textarea { padding:.3rem .4rem; font-weight:400; }
    .vars { margin-top:.5rem; display:flex; flex-wrap:wrap; gap:.25rem; align-items:center; }
    .vars .lbl { font-size:.72rem; color:var(--muted); width:100%; }
    .vars button { border:1px solid var(--border); background:var(--bg); border-radius:5px; font-family:ui-monospace,monospace; font-size:.66rem; cursor:pointer; padding:.15rem .3rem; }
    .tag { font-size:.75rem; color:var(--muted); margin-top:.3rem; }
    .muted { color:var(--muted); font-size:.85rem; }
  `],
})
export class LayoutEditor {
  @Input() settings!: TemplateSettings;
  /** Mode « page unique » : édite directement cet objet de mise en page
   *  (utilisé par les templates A3 multi-pages). */
  @Input() single?: LLayout;

  page = signal<'cover' | 'suivi' | 'page'>('cover');
  rev = signal(0);
  selected = signal<string | null>(null);
  private A = { a4: [595.2755, 841.8898], a3: [841.8898, 1190.5512] } as Record<string, number[]>;
  pageWpt() { const l = this.layout(); let [w, h] = this.A[l.page_size || 'a4']; if (l.orientation === 'landscape') [w, h] = [h, w]; return { w, h }; }
  get scale() { this.rev(); return DISP_W / this.pageWpt().w; }
  get dispW() { this.rev(); return DISP_W; }
  get dispH() { this.rev(); const { w, h } = this.pageWpt(); return Math.round(DISP_W * h / w); }
  variables = ['document_title', 'client_name', 'project_name', 'project_reference',
    'company_name', 'today', 'doc_date', 'version'];

  private drag: { el: LEl; sx: number; sy: number; ox: number; oy: number } | null = null;
  private resize: { el: LEl; sx: number; sy: number; ow: number; oh: number } | null = null;

  private ensure(): Record<string, LLayout> {
    if (!this.settings.layouts) this.settings.layouts = {};
    return this.settings.layouts as unknown as Record<string, LLayout>;
  }
  enabled = computed(() => {
    if (this.single) return true;
    this.rev();
    const l = this.ensure()[this.page()];
    return !!l;
  });
  layout(): LLayout {
    if (this.single) {
      if (!this.single.elements) this.single.elements = [];
      return this.single;
    }
    const store = this.ensure();
    if (!store[this.page()]) store[this.page()] = { background: '#ffffff', elements: [] };
    return store[this.page()];
  }
  current = computed<LEl | null>(() => {
    const id = this.selected();
    return this.layout().elements.find((e) => e.id === id) ?? null;
  });

  setPage(p: 'cover' | 'suivi' | 'page') { this.page.set(p); this.selected.set(null); this.rev.update((v) => v + 1); }
  setSize(sz: string) { this.layout().page_size = sz; this.rev.update((v) => v + 1); }
  setOrient(o: string) { this.layout().orientation = o; this.rev.update((v) => v + 1); }
  toggle(on: boolean) {
    const store = this.ensure();
    if (on) { if (!store[this.page()]) store[this.page()] = { background: '#ffffff', elements: [] }; }
    else { delete store[this.page()]; this.selected.set(null); }
    this.page.set(this.page());
  }
  setBg(c: string) { this.layout().background = c; }
  round(n: number) { return Math.round(n); }
  typeLabel(t: LType) {
    return { text: 'Texte', image: 'Image', logo: 'Logo', rect: 'Rectangle', ellipse: 'Ellipse', line: 'Ligne' }[t];
  }

  add(type: LType) {
    const id = `el${Date.now()}`;
    const base: LEl = { id, type, x: 60, y: 80, w: type === 'line' ? 200 : 300, h: type === 'line' ? 2 : 40 };
    if (type === 'text') Object.assign(base, { text: 'Nouveau texte', font: 'title', size: 24, color: '#1F497D', align: 'left', h: 40 });
    if (type === 'rect') Object.assign(base, { fill: '#1F497D', h: 120, w: 595, x: 0, y: 0 });
    if (type === 'ellipse') Object.assign(base, { fill: '#ffffff', stroke: '#1F497D', stroke_width: 2, w: 200, h: 200 });
    if (type === 'line') Object.assign(base, { color: '#1F497D', width: 2 });
    if (type === 'logo') Object.assign(base, { w: 140, h: 70, fit: 'contain' });
    if (type === 'image') Object.assign(base, { w: 200, h: 120, fit: 'contain' });
    this.layout().elements.push(base);
    this.selected.set(id);
  }
  remove(el: LEl) {
    const l = this.layout();
    l.elements = l.elements.filter((e) => e.id !== el.id);
    this.selected.set(null);
  }
  deselect(e: PointerEvent) { if (e.target === e.currentTarget) this.selected.set(null); }
  insertVar(el: LEl, v: string) { el.text = (el.text || '') + `{{${v}}}`; }

  startDrag(e: PointerEvent, el: LEl) {
    e.stopPropagation();
    this.selected.set(el.id);
    this.drag = { el, sx: e.clientX, sy: e.clientY, ox: el.x, oy: el.y };
  }
  startResize(e: PointerEvent, el: LEl) {
    e.stopPropagation();
    this.resize = { el, sx: e.clientX, sy: e.clientY, ow: el.w, oh: el.h };
  }
  @HostListener('window:pointermove', ['$event'])
  onMove(e: PointerEvent) {
    if (this.drag) {
      const dx = (e.clientX - this.drag.sx) / this.scale;
      const dy = (e.clientY - this.drag.sy) / this.scale;
      this.drag.el.x = Math.max(0, Math.round(this.drag.ox + dx));
      this.drag.el.y = Math.max(0, Math.round(this.drag.oy + dy));
    } else if (this.resize) {
      const dx = (e.clientX - this.resize.sx) / this.scale;
      const dy = (e.clientY - this.resize.sy) / this.scale;
      this.resize.el.w = Math.max(10, Math.round(this.resize.ow + dx));
      if (this.resize.el.type !== 'line') this.resize.el.h = Math.max(6, Math.round(this.resize.oh + dy));
    }
  }
  @HostListener('window:pointerup')
  onUp() { this.drag = null; this.resize = null; }

  upload(event: Event, el: LEl) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { el.asset_url = reader.result as string; };
    reader.readAsDataURL(file);
  }
}
