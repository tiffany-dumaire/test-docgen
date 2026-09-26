import { Component, inject, signal, Input, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgTemplateOutlet } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { BackDirective } from '@shared/back.directive';
import { DocumentService } from '@core/services/document.service';
import { ToastService } from '@core/services/api.service';
import { RichTextEditor } from '@shared/rich-text-editor';
import { ExcelBuilder } from '@shared/content/excel-builder';
import { LayoutEditor } from '@shared/content/layout-editor';
import { MatTabsModule } from '@angular/material/tabs';
import { StyleEditor } from '@shared/content/style-editor';
import { ProjectService } from '@core/services/project.service';
import {
  A3Page,
  Block,
  BlockType,
  Choice,
  DocType,
  DocumentTemplate,
  ExcelSheet,
  LANGUAGES,
  Overlay,
  Project,
  StyleMap,
  TemplateLanguage,
  TemplateSettings,
} from '@core/models';

interface PaletteItem {
  type: BlockType;
  label: string;
  icon: string;
}

/** Métadonnées d'affichage par type de modèle (onglets séparés par type). */
const TYPE_META: Record<string, { label: string; icon: string; hint: string }> = {
  docx: { label: 'Word', icon: '📝', hint: 'Document Word par blocs : titres, textes, tableaux, images, diagrammes.' },
  pdf: { label: 'PDF', icon: '📄', hint: 'Le PDF est un document Word exporté à l’identique (mêmes blocs et mise en page).' },
  xlsx: { label: 'Excel', icon: '📊', hint: 'Classeur Excel : onglets, colonnes typées, tableaux croisés, règles.' },
  a3: { label: 'Template A3 (PNG / PDF)', icon: '🖼️', hint: 'Affiche / planche A3 ou A4 à positionnement libre, exportée en PNG ou PDF.' },
  md: { label: 'Markdown', icon: 'M↓', hint: 'Document Markdown par blocs, exporté en .md.' },
  pptx: { label: 'PowerPoint', icon: '📽️', hint: 'Présentation PowerPoint : chaque titre démarre une diapositive.' },
  brochure: { label: 'Brochure', icon: '📕', hint: 'Brochure par blocs, exportée en Word (.docx).' },
  lettre: { label: 'Lettre', icon: '✉️', hint: 'Lettre par blocs, exportée en Word (.docx).' },
  mail: { label: 'Mail', icon: '📧', hint: 'E-mail par blocs, exporté en Markdown (.md).' },
};

@Component({
  selector: 'app-template-builder',
  imports: [BackDirective, FormsModule, RichTextEditor, NgTemplateOutlet, ExcelBuilder, LayoutEditor, StyleEditor, MatTabsModule],
  templateUrl: './template-builder.html',
  styleUrl: './template-builder.scss',
})
export class TemplateBuilder {
  private service = inject(DocumentService);
  private projectService = inject(ProjectService);
  private toast = inject(ToastService);
  private san = inject(DomSanitizer);

  // Aperçu inline (onglet « Aperçu »)
  previewFrame = signal<SafeResourceUrl | null>(null);
  previewImg = signal<string | null>(null);
  previewKind = signal<string | null>(null);
  previewing = signal(false);
  private previewUrl: string | null = null;
  // Contenu par langue : langue de contenu en cours d'édition + base (principale).
  contentLang = signal<string>('');
  private baseSchema: unknown = null;
  private loadedLang = '';
  private router = inject(Router);
  allProjects = signal<Project[]>([]);

  @Input() id?: string;

  model = signal<DocumentTemplate | null>(null);
  docTypes = signal<Choice[]>([]);
  languages = LANGUAGES;
  saving = signal(false);
  activeA3 = signal<string>('');
  activeOverlay = signal<string>('');
  private counter = 0;
  private dragType: BlockType | null = null;
  private dragIndex: number | null = null;

  private fullPalette: PaletteItem[] = [
    { type: 'heading', label: 'Titre 1–5', icon: 'H' },
    { type: 'text', label: 'Texte', icon: '¶' },
    { type: 'richtext', label: 'Texte enrichi', icon: '✎' },
    { type: 'bullet_list', label: 'Liste à puces', icon: '•' },
    { type: 'numbered_list', label: 'Liste numérotée', icon: '1.' },
    { type: 'image', label: 'Image', icon: '🖼️' },
    { type: 'logo', label: 'Logo', icon: '🏢' },
    { type: 'table', label: 'Tableau', icon: '▦' },
    { type: 'field', label: 'Champ à remplir', icon: '⌨' },
    { type: 'code', label: 'Bloc de code', icon: '</>' },
    { type: 'link', label: 'Lien URL', icon: '🔗' },
    { type: 'contacts', label: 'Contacts', icon: '📇' },
    { type: 'diagram', label: 'Diagramme (SmartArt)', icon: '⬗' },
    { type: 'form_diagram', label: 'Diagramme de formulaire', icon: '📊' },
    { type: 'spacer', label: 'Espace', icon: '␣' },
  ];

  blocks = computed(() => (this.model()?.schema as Block[]) ?? []);
  settings = computed<TemplateSettings>(() => this.model()?.settings ?? {});

  // --- Drapeaux de type ---
  isExcel = computed(() => this.model()?.doc_type === 'xlsx');
  isA3 = computed(() => this.model()?.doc_type === 'a3');
  isMarkdown = computed(() => this.model()?.doc_type === 'md');
  isPptx = computed(() => this.model()?.doc_type === 'pptx');
  isPdf = computed(() => this.model()?.doc_type === 'pdf');
  isWord = computed(() => this.model()?.doc_type === 'docx');
  /** Types rendus à partir de blocs (contenu). */
  isBlocks = computed(() => ['docx', 'pdf', 'md', 'pptx', 'brochure', 'lettre', 'mail', 'offre'].includes(this.model()?.doc_type ?? ''));
  /** Onglet Structure & styles (mise en page libre + styles). */
  hasStructure = computed(() => this.isWord() || this.isPdf());
  hasTableColor = computed(() => this.isWord() || this.isPdf() || this.isExcel());
  /** En-tête / pied de page configurables : Word, PDF et Lettre. */
  hasHeaderFooter = computed(() => this.isWord() || this.isPdf()
    || this.model()?.doc_type === 'lettre' || this.model()?.doc_type === 'offre');
  /** Onglet « Éléments dynamiques » : calques libres PDF / PPTX. */
  hasOverlays = computed(() => this.isPdf() || this.isPptx());
  overlayNoun = computed(() => (this.isPptx() ? 'diapositives' : 'pages'));

  typeMeta = computed(() => TYPE_META[this.model()?.doc_type ?? 'docx'] ?? TYPE_META['docx']);

  /** Palette adaptée au type (Markdown/PPTX sans logo de mise en page libre). */
  palette = computed<PaletteItem[]>(() => {
    if (this.isMarkdown()) {
      const drop = new Set<BlockType>(['contacts']);
      return this.fullPalette.filter((p) => !drop.has(p.type));
    }
    return this.fullPalette;
  });

  /** Options du sélecteur de type : types de document + « Formulaire ». */
  typeOptions = computed<Choice[]>(() => {
    const order = ['docx', 'pdf', 'xlsx', 'a3', 'md', 'pptx', 'brochure', 'lettre', 'mail'];
    const base = this.docTypes()
      .filter((d) => order.includes(d.value))
      .sort((a, b) => order.indexOf(a.value) - order.indexOf(b.value));
    return [...base, { value: 'form', label: 'Formulaire (avec diagrammes)' }];
  });

  pptx = () => {
    const st = this.model()?.settings;
    if (st && !st.pptx) st.pptx = {};
    return (st?.pptx ?? {}) as { main_color?: string; include_logo?: boolean };
  };

  templateStyles = (): StyleMap => {
    const st = this.model()?.settings;
    if (st && !st.styles) st.styles = {};
    return (st?.styles ?? {}) as StyleMap;
  };
  isProjSel(m: DocumentTemplate, id: number) { return (m.projects ?? []).includes(id); }
  toggleProj(m: DocumentTemplate, id: number) {
    m.projects = m.projects ?? [];
    const i = m.projects.indexOf(id);
    if (i >= 0) m.projects.splice(i, 1); else m.projects.push(id);
  }

  // --- Multilingue (point 5) : langues disponibles + nom par langue ---
  flagOf(code: string) { return this.languages.find((l) => l.value === code)?.flag ?? ''; }
  labelOf(code: string) { return this.languages.find((l) => l.value === code)?.label ?? code; }
  /** Langues du modèle (principale incluse, ordre des langues connues). */
  availableLangs(m: DocumentTemplate): TemplateLanguage[] {
    const set = new Set<TemplateLanguage>(m.languages ?? []);
    if (m.language) set.add(m.language);
    if (set.size === 0) set.add((m.language ?? 'fr') as TemplateLanguage);
    return this.languages.map((l) => l.value).filter((v) => set.has(v));
  }
  hasLang(m: DocumentTemplate, code: TemplateLanguage) { return (m.languages ?? []).includes(code); }
  toggleLang(m: DocumentTemplate, code: TemplateLanguage) {
    const list = [...(m.languages ?? [])];
    const i = list.indexOf(code);
    if (i >= 0) {
      if (code === m.language) return;          // la langue principale reste active
      list.splice(i, 1);
      if (m.names) delete m.names[code];
    } else {
      list.push(code);
    }
    m.languages = list;
  }
  // --- En-tête / pied de page configurables (Word, PDF, Lettre) ---
  hfConfigured(kind: 'header' | 'footer'): boolean {
    return !!(this.settings() as TemplateSettings)[kind];
  }
  toggleHf(kind: 'header' | 'footer', on: boolean) {
    const m = this.model(); if (!m) return;
    if (!m.settings) m.settings = {};
    if (on) {
      m.settings[kind] = { enabled: true, text: '', align: kind === 'footer' ? 'center' : 'left',
        show_logo: kind === 'header' };
    } else {
      delete m.settings[kind];
    }
  }
  hfVal(kind: 'header' | 'footer', key: 'enabled' | 'text' | 'html' | 'align' | 'show_logo') {
    const o = (this.settings() as TemplateSettings)[kind] as Record<string, unknown> | undefined;
    if (!o) return key === 'enabled' ? true : (key === 'align' ? (kind === 'footer' ? 'center' : 'left') : '');
    return key === 'enabled' ? o['enabled'] !== false : (o[key] ?? '');
  }
  setHf(kind: 'header' | 'footer', key: string, val: unknown) {
    const m = this.model(); if (!m) return;
    if (!m.settings) m.settings = {};
    if (!m.settings[kind]) m.settings[kind] = { enabled: true };
    (m.settings[kind] as Record<string, unknown>)[key] = val;
  }

  nameFor(m: DocumentTemplate, code: string) { return (m.names ?? {})[code] ?? ''; }
  setName(m: DocumentTemplate, code: string, value: string) {
    m.names = { ...(m.names ?? {}) };
    if (value) m.names[code] = value; else delete m.names[code];
  }

  // --- Contenu par langue (blocs) : édition d'un contenu spécifique par langue ---
  private i18nBucket(m: DocumentTemplate): Record<string, { schema?: unknown }> {
    m.settings = m.settings || {};
    const s = m.settings as unknown as { content_i18n?: Record<string, { schema?: unknown }> };
    s.content_i18n = s.content_i18n || {};
    return s.content_i18n;
  }
  switchContentLang(to: string) {
    const m = this.model(); if (!m) return;
    const primary = m.language || 'fr';
    const from = this.loadedLang;
    if (to === from) return;
    // Range le contenu en cours dans sa langue.
    if (from === primary) { this.baseSchema = m.schema; }
    else { this.i18nBucket(m)[from] = { schema: m.schema }; }
    // Charge le contenu de la langue cible (copie du contenu de base si absent).
    if (to === primary) {
      m.schema = (this.baseSchema as Block[]) ?? m.schema;
    } else {
      const bucket = this.i18nBucket(m)[to];
      const src = bucket?.schema ?? this.baseSchema ?? m.schema;
      m.schema = JSON.parse(JSON.stringify(src));
    }
    this.loadedLang = to;
    this.contentLang.set(to);
    this.model.set({ ...m });
  }
  /** Avant sauvegarde : renvoie le contenu de base dans schema, les langues dans content_i18n. */
  private syncContentForSave() {
    const m = this.model(); if (!m) return;
    const primary = m.language || 'fr';
    if (this.loadedLang !== primary) {
      this.i18nBucket(m)[this.loadedLang] = { schema: m.schema };
      m.schema = (this.baseSchema as Block[]) ?? [];
      this.loadedLang = primary;
      this.contentLang.set(primary);
    } else {
      this.baseSchema = m.schema;
    }
  }

  /** Génère et télécharge la planche A3 dans la langue demandée. */
  exportA3Lang(fmt: 'pdf' | 'png' | 'svg', lang: string) {
    const m = this.model();
    if (!m?.id) { this.toast.error('Enregistrez le modèle avant de générer un rendu.'); return; }
    this.service.exportA3(m.id, fmt, lang).subscribe({
      next: (blob) => {
        const u = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = u; a.download = `${m.slug || 'template'}-${lang}.${fmt}`;
        a.click(); URL.revokeObjectURL(u);
      },
      error: () => this.toast.error('Export impossible.'),
    });
  }
  excelSheets = computed<ExcelSheet[]>(() => {
    const s = this.model()?.settings;
    if (s && !s.excel) s.excel = { sheets: [] };
    return s?.excel?.sheets ?? [];
  });

  a3Pages = computed<A3Page[]>(() => {
    const s = this.model()?.settings;
    if (s && !s.a3_pages) s.a3_pages = [];
    return s?.a3_pages ?? [];
  });

  overlays = computed<Overlay[]>(() => {
    const s = this.model()?.settings;
    if (s && !s.overlays) s.overlays = [];
    return s?.overlays ?? [];
  });

  private readonly pagePresets = new Set(['all', 'first', 'last', 'odd', 'even']);
  pagePreset(ov: Overlay): string {
    const p = (ov.target?.pages || 'all').trim();
    return this.pagePresets.has(p) ? p : 'custom';
  }
  setPagePreset(ov: Overlay, v: string) {
    ov.target = ov.target ?? { pages: 'all' };
    ov.target.pages = v === 'custom' ? (this.pagePresets.has(ov.target.pages) ? '' : ov.target.pages) : v;
  }

  addOverlay() {
    const m = this.model(); if (!m) return;
    m.settings = m.settings ?? {};
    m.settings.overlays = m.settings.overlays ?? [];
    const isPptx = m.doc_type === 'pptx';
    const ov: Overlay = {
      id: `ov_${Date.now()}_${this.counter++}`,
      name: `Calque ${m.settings.overlays.length + 1}`,
      enabled: true,
      doc_type: isPptx ? 'pptx' : 'pdf',
      target: { pages: 'all' },
      layout: {
        page_size: isPptx ? 'slide' : 'a4',
        orientation: 'portrait',
        background: undefined,
        elements: [],
      },
    };
    m.settings.overlays.push(ov);
    this.activeOverlay.set(ov.id);
    this.model.set({ ...m });
  }
  removeOverlay(id: string) {
    const m = this.model(); if (!m) return;
    const list = m.settings?.overlays ?? [];
    m.settings!.overlays = list.filter((o) => o.id !== id);
    if (this.activeOverlay() === id) {
      this.activeOverlay.set(m.settings!.overlays[0]?.id ?? '');
    }
    this.model.set({ ...m });
  }

  allVariables = computed(() => {
    const builtins = ['project_name', 'client_name', 'project_reference',
      'company_name', 'document_title', 'today', 'version'];
    const keys = this.blocks().filter((b) => b.type === 'field' && b.key).map((b) => b.key!);
    return [...builtins, ...keys];
  });

  constructor() {
    this.service.choices().subscribe((c) => this.docTypes.set(c.document_types));
    this.projectService.list().subscribe((r) => this.allProjects.set(r.results));
    setTimeout(() => {
      if (this.id) {
        this.service.template(+this.id).subscribe((t) => {
          if (!t.settings) t.settings = this.defaultSettings();
          this.model.set(t);
          this.baseSchema = t.schema; this.loadedLang = t.language || 'fr';
          this.contentLang.set(this.loadedLang);
          if (t.doc_type === 'a3') this.ensureA3(t);
          if (t.settings?.overlays?.length) this.activeOverlay.set(t.settings.overlays[0].id);
          this.startHistory();
        });
      } else {
        this.model.set({
          name: '', slug: '', description: '', doc_type: 'docx', language: 'fr',
          builder_key: 'custom', is_block_based: true, schema: [],
          settings: this.defaultSettings(), is_active: true,
          scope: 'global', projects: [],
        });
        this.baseSchema = []; this.loadedLang = 'fr'; this.contentLang.set('fr');
        this.startHistory();
      }
    });
  }

  // ------- Historique d'annulation (Annuler / Réinitialiser, jusqu'à 10) -------
  private history: string[] = [];
  private initialSnapshot = '';
  private histTimer: ReturnType<typeof setInterval> | null = null;
  private applyingHistory = false;

  private serialize(): string { const m = this.model(); return m ? JSON.stringify(m) : ''; }
  private startHistory() {
    this.initialSnapshot = this.serialize();
    this.history = this.initialSnapshot ? [this.initialSnapshot] : [];
    if (this.histTimer) clearInterval(this.histTimer);
    this.histTimer = setInterval(() => this.snapshot(), 1200);
  }
  private snapshot() {
    if (this.applyingHistory) return;
    const cur = this.serialize();
    if (!cur) return;
    if (this.history.length === 0 || this.history[this.history.length - 1] !== cur) {
      this.history.push(cur);
      if (this.history.length > 11) this.history.shift();  // 1 initial + 10 changements
    }
  }
  canUndo() { return this.history.length > 1; }
  canReset() { return !!this.initialSnapshot && this.serialize() !== this.initialSnapshot; }
  undo() {
    this.snapshot();
    if (this.history.length <= 1) return;
    this.history.pop();                                   // retire l'état courant
    this.applyState(this.history[this.history.length - 1]);
  }
  reset() {
    if (!this.initialSnapshot) return;
    this.applyState(this.initialSnapshot);
    this.history = [this.initialSnapshot];
  }
  private applyState(json: string) {
    try {
      const obj = JSON.parse(json);
      this.applyingHistory = true;
      this.model.set(obj);
      this.baseSchema = obj.schema;
      setTimeout(() => (this.applyingHistory = false), 0);
    } catch { /* ignore */ }
  }
  ngOnDestroy() {
    if (this.histTimer) clearInterval(this.histTimer);
    if (this.previewUrl) URL.revokeObjectURL(this.previewUrl);
  }

  /** Aperçu du modèle affiché en ligne dans l'onglet « Aperçu ». */
  refreshPreview() {
    if (!this.isEdit()) { this.toast.error("Enregistrez d'abord le modèle."); return; }
    this.syncContentForSave();
    const m = this.model(); if (!m) return;
    this.previewing.set(true);
    this.service.updateTemplate(+this.id!, m).subscribe({
      next: () => {
        this.service.previewTemplate(+this.id!).subscribe({
          next: (r) => {
            this.previewing.set(false);
            const bytes = Uint8Array.from(atob(r.b64 || ''), (c) => c.charCodeAt(0));
            const blob = new Blob([bytes], { type: r.mime || 'application/octet-stream' });
            const url = URL.createObjectURL(blob);
            if (this.previewUrl) URL.revokeObjectURL(this.previewUrl);
            this.previewUrl = url;
            this.previewKind.set(r.kind);
            if (r.kind === 'image') { this.previewImg.set(url); this.previewFrame.set(null); }
            else { this.previewFrame.set(this.san.bypassSecurityTrustResourceUrl(url)); this.previewImg.set(null); }
          },
          error: () => { this.previewing.set(false); this.toast.error('Aperçu impossible.'); },
        });
      },
      error: () => { this.previewing.set(false); this.toast.error('Aperçu impossible.'); },
    });
  }

  private defaultSettings(): TemplateSettings {
    return {
      cover_title: '{{document_title}}',
      cover_subtitle: '{{client_name}} — {{project_name}}',
      include_cover: true, include_suivi: true, include_toc: true,
      pdf_from_docx: true,
    };
  }

  isEdit() { return !!this.id; }

  onFormatChange(m: DocumentTemplate) {
    // « Formulaire » = modèle de formulaire (autre éditeur).
    if ((m.doc_type as string) === 'form') {
      this.router.navigate(['/form-templates/new']);
      return;
    }
    m.settings = m.settings ?? {};
    if (m.doc_type === 'xlsx' && !m.settings.excel) {
      m.settings.excel = {
        sheets: [{
          id: `sh${Date.now()}`, name: 'Onglet 1', type: 'table',
          groups: [], show_totals: false, allow_add_rows: true,
          allow_add_columns: false,
          columns: [
            { key: 'col1', label: 'Colonne 1', type: 'text' },
            { key: 'col2', label: 'Colonne 2', type: 'text' },
          ],
        }],
      };
    }
    if (m.doc_type === 'a3') {
      m.settings.a3_export = m.settings.a3_export ?? 'pdf';
      this.ensureA3(m);
    }
    this.model.set({ ...m });
  }

  private ensureA3(m: DocumentTemplate) {
    m.settings = m.settings ?? {};
    if (!m.settings.a3_pages || !m.settings.a3_pages.length) {
      m.settings.a3_pages = [this.newA3Page(1)];
    }
    this.activeA3.set(m.settings.a3_pages[0].id);
  }

  private newA3Page(n: number): A3Page {
    return {
      id: `a3_${Date.now()}_${this.counter++}`,
      name: `Page ${n}`,
      layout: { page_size: 'a3', orientation: 'portrait', background: '#ffffff', elements: [] },
    };
  }

  addA3Page() {
    const m = this.model(); if (!m) return;
    m.settings = m.settings ?? {};
    m.settings.a3_pages = m.settings.a3_pages ?? [];
    const pg = this.newA3Page(m.settings.a3_pages.length + 1);
    m.settings.a3_pages.push(pg);
    this.activeA3.set(pg.id);
    this.model.set({ ...m });
  }
  removeA3Page(id: string) {
    const m = this.model(); if (!m) return;
    const pages = m.settings?.a3_pages ?? [];
    if (pages.length <= 1) { this.toast.error('Au moins une page est nécessaire.'); return; }
    m.settings!.a3_pages = pages.filter((p) => p.id !== id);
    if (this.activeA3() === id) this.activeA3.set(m.settings!.a3_pages[0].id);
    this.model.set({ ...m });
  }

  onName(name: string, m: DocumentTemplate) {
    if (!this.isEdit()) m.slug = this.slugify(name);
  }

  blockLabel(type: BlockType): string {
    return this.fullPalette.find((p) => p.type === type)?.label ?? type;
  }

  // --- Drag & drop ---
  onPaletteDrag(type: BlockType) { this.dragType = type; this.dragIndex = null; }
  onBlockDrag(i: number) { this.dragIndex = i; this.dragType = null; }
  onCanvasDrop() {
    if (this.dragType) this.add(this.dragType);
    this.dragType = null; this.dragIndex = null;
  }
  onDropAt(index: number) {
    const m = this.model(); if (!m) return;
    const arr = m.schema as Block[];
    if (this.dragType) {
      arr.splice(index, 0, this.newBlock(this.dragType));
    } else if (this.dragIndex !== null && this.dragIndex !== index) {
      const [moved] = arr.splice(this.dragIndex, 1);
      arr.splice(index, 0, moved);
    }
    this.dragType = null; this.dragIndex = null;
    this.model.set({ ...m });
  }

  private newBlock(type: BlockType): Block {
    const id = `b${Date.now()}_${this.counter++}`;
    const b: Block = { id, type };
    if (type === 'heading') { b.level = 2; b.text = ''; }
    else if (type === 'text' || type === 'code') b.text = '';
    else if (type === 'richtext') b.text = '';
    else if (type === 'bullet_list' || type === 'numbered_list') b.items = ['', ''];
    else if (type === 'image') { b.width_pct = 40; b.align = 'left'; b.asset_url = ''; }
    else if (type === 'logo') { b.width_pct = 30; b.align = 'left'; }
    else if (type === 'table') { b.label = ''; b.columns = [{ label: 'Colonne 1' }, { label: 'Colonne 2' }]; b.allow_edit_columns = false; }
    else if (type === 'field') { b.label = ''; b.key = ''; b.field_type = 'text'; b.required = false; b.show_label = true; }
    else if (type === 'link') { b.label = ''; b.url = ''; }
    else if (type === 'contacts') { b.label = 'Contacts'; b.scope = 'both'; }
    else if (type === 'diagram') {
      b.variant = 'process'; b.width_pct = 100; b.align = 'center';
      b.diagram_items = [{ title: 'Étape 1', text: '' }, { title: 'Étape 2', text: '' }, { title: 'Étape 3', text: '' }];
    }
    else if (type === 'form_diagram') { b.diagram_key = 'd1'; b.width_pct = 90; b.align = 'center'; }
    return b;
  }

  add(type: BlockType) {
    const m = this.model(); if (!m) return;
    (m.schema as Block[]).push(this.newBlock(type));
    this.model.set({ ...m });
  }
  removeBlock(i: number) {
    const m = this.model(); if (!m) return;
    (m.schema as Block[]).splice(i, 1); this.model.set({ ...m });
  }
  move(i: number, dir: number) {
    const m = this.model(); if (!m) return;
    const arr = m.schema as Block[]; const j = i + dir;
    if (j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]]; this.model.set({ ...m });
  }

  addItem(b: Block) { b.items = b.items ?? []; b.items.push(''); }
  addDiagramItem(b: Block) { b.diagram_items = b.diagram_items ?? []; b.diagram_items.push({ title: '', text: '' }); }
  addCol(b: Block) { b.columns = b.columns ?? []; b.columns.push({ label: `Colonne ${b.columns.length + 1}` }); }
  removeCol(b: Block, i: number) { b.columns?.splice(i, 1); }
  syncKey(b: Block) { b.key = this.slugify(b.label || '') || 'champ'; }
  setOptions(b: Block, raw: string) { b.options = raw.split(',').map((s) => s.trim()).filter(Boolean); }

  uploadImage(event: Event, block: Block) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.service.uploadAsset(file).subscribe({
      next: (r) => { block.asset_url = r.url; this.toast.success('Image ajoutée.'); },
      error: () => this.toast.error("Échec de l'upload."),
    });
  }

  copyVar(v: string) {
    navigator.clipboard?.writeText(`{{${v}}}`);
    this.toast.success(`{{${v}}} copié`);
  }

  private slugify(s: string): string {
    return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  }

  save() {
    this.syncContentForSave();
    const m = this.model(); if (!m) return;
    if (!m.name) { this.toast.error('Le nom est obligatoire.'); return; }

    if (this.isExcel()) {
      m.is_block_based = false;
      m.builder_key = 'excel_workbook';
      m.schema = [];
      if (!m.settings?.excel?.sheets?.length) {
        this.toast.error('Ajoutez au moins un onglet au classeur.'); return;
      }
      m.settings.excel.sheets.forEach((sh) =>
        (sh.columns ?? []).forEach((c, i) => { if (!c.key) c.key = `col${i + 1}`; }));
      this.persist(m);
      return;
    }

    if (this.isA3()) {
      m.is_block_based = false;
      m.builder_key = 'a3';
      m.schema = [];
      if (!m.settings?.a3_pages?.length) {
        this.toast.error('Ajoutez au moins une page.'); return;
      }
      this.persist(m);
      return;
    }

    // Types par blocs (Word / PDF / Markdown / PowerPoint)
    (m.schema as Block[]).forEach((b) => { if (b.type === 'field' && !b.key) this.syncKey(b); });
    (m.schema as Block[]).forEach((b) => {
      if (b.items) b.items = b.items.filter((x) => x.trim() !== '');
    });
    m.is_block_based = true; m.builder_key = 'custom';
    this.persist(m);
  }

  private persist(m: DocumentTemplate) {
    this.saving.set(true);
    const req = this.isEdit() ? this.service.updateTemplate(+this.id!, m) : this.service.createTemplate(m);
    req.subscribe({
      next: () => { this.saving.set(false); this.toast.success('Modèle enregistré.'); this.router.navigate(['/templates']); },
      error: () => { this.saving.set(false); this.toast.error('Erreur (identifiant déjà utilisé ?).'); },
    });
  }
}
