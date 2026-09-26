import { Component, Input, signal, computed, HostListener, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TemplateSettings } from '@core/models';
import { CompanyService } from '@core/services/company.service';

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
  templateUrl: './layout-editor.html',
  styleUrl: './layout-editor.scss',
})
export class LayoutEditor implements OnInit {
  @Input() settings!: TemplateSettings;
  /** Mode « page unique » : édite directement cet objet de mise en page
   *  (utilisé par les templates A3 multi-pages et les calques dynamiques). */
  @Input() single?: LLayout;
  /** Jeu de formats proposés : 'page' (A4/A3 + orientation) ou 'slide' (16:9 / 4:3). */
  @Input() sizeMode: 'page' | 'slide' = 'page';
  /** Valeurs réelles supplémentaires pour l'aperçu des variables (facultatif). */
  @Input() previewValues?: Record<string, string>;

  private companySvc = inject(CompanyService);
  /** Aperçu des données : remplace les {{variables}} par des valeurs réelles. */
  previewData = signal(false);
  companyName = signal('VNV SA');
  companyLogo = signal<string | null>(null);

  ngOnInit() {
    // Récupère le nom + logo de l'entreprise pour l'aperçu « données réelles ».
    this.companySvc.get().subscribe({
      next: (c) => {
        if (c?.name) this.companyName.set(c.name);
        this.companyLogo.set(c?.logoUrl || c?.logo || null);
      },
      error: () => { /* aperçu avec valeurs d'exemple */ },
    });
  }

  /** Valeurs d'exemple/réelles pour interpoler les variables dans l'aperçu. */
  private previewVars(): Record<string, string> {
    const today = new Date().toLocaleDateString('fr-CH');
    return {
      document_title: 'Document de démonstration',
      client_name: 'Client Démo SA',
      project_name: 'Projet Démo',
      project_reference: 'REF-2024-001',
      project_description: 'Description du projet de démonstration.',
      version: 'v1',
      today, doc_date: today,
      company_name: this.companyName(),
      ...(this.previewValues || {}),
    };
  }

  /** Texte affiché dans le canvas : brut, ou interpolé si l'aperçu est actif. */
  resolveText(text?: string): string {
    const t = text || 'Texte';
    if (!this.previewData()) return t;
    const vars = this.previewVars();
    return t.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (m, k) => vars[k] ?? m);
  }

  page = signal<'cover' | 'suivi' | 'page'>('cover');
  rev = signal(0);
  selected = signal<string | null>(null);
  private A = {
    a4: [595.2755, 841.8898], a3: [841.8898, 1190.5512],
    slide: [960, 540], slide43: [720, 540],
  } as Record<string, number[]>;
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
