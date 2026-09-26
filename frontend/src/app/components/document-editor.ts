import { Component, inject, signal, Input, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { MatTabsModule } from '@angular/material/tabs';
import { ActivatedRoute, Router } from '@angular/router';
import { BackDirective } from '@shared/back.directive';
import { DocumentService } from '@core/services/document.service';
import { ProjectService } from '@core/services/project.service';
import { CompanyService } from '@core/services/company.service';
import { ToastService } from '@core/services/api.service';
import { PreviewService } from '@core/services/preview.service';
import { DataGrid } from '@shared/data-grid';
import {
  Block,
  CellType,
  Choice,
  Confidentiality,
  DocumentTemplate,
  DocumentVersion,
  ExcelSheet,
  ProjectDocument,
  Project,
  TableData,
} from '@core/models';

@Component({
  selector: 'app-document-editor',
  imports: [BackDirective, FormsModule, DatePipe, DataGrid, MatTabsModule],
  templateUrl: './document-editor.html',
  styleUrl: './document-editor.scss',
})
export class DocumentEditor {
  private service = inject(DocumentService);
  private projectSvc = inject(ProjectService);
  private companySvc = inject(CompanyService);
  private toast = inject(ToastService);
  private previewSvc = inject(PreviewService);
  private san = inject(DomSanitizer);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  // Aperçu inline (onglet « Aperçu »)
  previewFrame = signal<SafeResourceUrl | null>(null);
  previewImg = signal<string | null>(null);
  previewKind = signal<string | null>(null);
  private previewUrl: string | null = null;

  @Input() id?: string;

  doc = signal<ProjectDocument | null>(null);
  projects = signal<Project[]>([]);
  templates = signal<DocumentTemplate[]>([]);
  confidentialityLevels = signal<Choice[]>([]);
  selectedProject = signal<Project | null>(null);
  companyName = signal('');
  jsonError = signal(false);
  saving = signal(false);
  generating = signal(false);
  previewing = signal(false);

  gen = { author_initials: '', author_name: '', comment: '' };
  private jsonCache = '';

  activeTemplate = computed(() => {
    const d = this.doc();
    if (!d?.template) return null;
    return this.templates().find((t) => t.id === d.template) ?? null;
  });

  versions = computed(() => this.doc()?.versions ?? []);

  constructor() {
    this.projectSvc.list().subscribe((r) => this.projects.set(r.results));
    this.service.templates({ is_active: true, page_size: 1000 }).subscribe((r) => this.templates.set(r.results));
    this.service.choices().subscribe((c) => this.confidentialityLevels.set(c.confidentiality_levels));
    this.companySvc.get().subscribe((c) => this.companyName.set(c.name));

    setTimeout(() => {
      if (this.id) {
        this.service.get(+this.id).subscribe((d) => {
          this.doc.set(d);
          if (d.project) this.loadProject(d.project);
        });
      } else {
        const preProject = this.route.snapshot.queryParamMap.get('project');
        const pid = preProject ? +preProject : null;
        this.doc.set({
          project: pid as unknown as number,
          template: null as unknown as number,
          title: '',
          confidentiality: Confidentiality.Internal,
          data: {},
        });
        if (pid) this.loadProject(pid);
      }
    });
  }

  isEdit() {
    return !!this.id;
  }

  asBlocks(tpl: DocumentTemplate): Block[] {
    return (tpl.schema as Block[]) ?? [];
  }

  onProjectChange(pid: number) {
    if (pid) this.loadProject(pid);
  }
  private loadProject(pid: number) {
    this.projectSvc.get(pid).subscribe((p) => this.selectedProject.set(p));
  }

  onTemplateChange() {
    // Initialise les données pour le nouveau modèle
    const d = this.doc();
    const tpl = this.activeTemplate();
    if (d && tpl?.is_block_based) {
      this.initBlockData(d, tpl);
      this.doc.set({ ...d });
    }
  }

  private initBlockData(d: ProjectDocument, tpl: DocumentTemplate) {
    for (const block of this.asBlocks(tpl)) {
      if (block.type === 'field' && block.key && !(block.key in d.data)) {
        d.data[block.key] = '';
      }
      if (block.type === 'table' && block.key) {
        const existing = d.data[block.key] as TableData | undefined;
        if (!existing || !Array.isArray(existing.columns)) {
          d.data[block.key] = {
            columns: (block.columns ?? []).map((c) => c.label),
            rows: [],
          };
        }
      }
    }
  }

  // --- Champs ---
  fieldVal(d: ProjectDocument, key: string): string {
    const v = d.data[key];
    return v == null ? '' : String(v);
  }
  setField(d: ProjectDocument, key: string, value: unknown) {
    d.data[key] = value;
  }
  inputType(t?: string): string {
    if (t === 'number') return 'number';
    if (t === 'date') return 'date';
    return 'text';
  }

  // --- Tableaux : renvoie toujours la même référence ---
  activeSheet = signal(0);

  isExcelWorkbook(tpl: DocumentTemplate): boolean {
    return tpl.doc_type === 'xlsx' && !!tpl.settings?.excel?.sheets?.length;
  }
  wbSheets(tpl: DocumentTemplate): ExcelSheet[] {
    return tpl.settings?.excel?.sheets ?? [];
  }
  sheetIcon(t: string) { return t === 'table' ? '▦' : t === 'pivot' ? '⊞' : 'ℹ'; }
  typeShort(t: CellType) {
    return { text: 'texte', integer: 'entier', decimal: 'décimal',
      currency: 'monnaie', percent: '%', date: 'date' }[t] ?? t;
  }
  sourceName(tpl: DocumentTemplate, sh: ExcelSheet): string {
    const src = this.wbSheets(tpl).find((x) => x.id === sh.pivot?.source);
    return src?.name ?? '—';
  }
  sheetGrid(d: ProjectDocument, sh: ExcelSheet): TableData {
    const data = d.data as Record<string, unknown>;
    const store = (data['sheets'] ??= {}) as Record<string, TableData>;
    const labels = (sh.columns ?? []).map((c) => c.label);
    let sd = store[sh.id];
    if (!sd || !Array.isArray(sd.columns) || !sd.columns.length) {
      sd = { columns: labels, rows: sd?.rows ?? [] };
      store[sh.id] = sd;
    }
    return sd;
  }

  tableModel(d: ProjectDocument, block: Block): TableData {
    const key = block.key!;
    let td = d.data[key] as TableData | undefined;
    if (!td || !Array.isArray(td.columns)) {
      td = { columns: (block.columns ?? []).map((c) => c.label), rows: [] };
      d.data[key] = td;
    }
    return td;
  }

  // --- Interpolation d'aperçu ---
  interpolate(text: string): string {
    const ctx = this.previewContext();
    return text.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (m, k) =>
      k in ctx ? String(ctx[k]) : m,
    );
  }
  private previewContext(): Record<string, unknown> {
    const d = this.doc();
    const p = this.selectedProject();
    const ctx: Record<string, unknown> = {
      project_name: p?.name ?? '',
      client_name: p?.clientName ?? '',
      project_reference: p?.reference ?? '',
      project_description: p?.description ?? '',
      company_name: this.companyName(),
      document_title: d?.title ?? '',
      today: new Date().toLocaleDateString('fr-FR'),
      version: `v${d?.currentVersion ?? 0}`,
    };
    for (const [k, v] of Object.entries(d?.data ?? {})) {
      if (typeof v === 'string' || typeof v === 'number') ctx[k] = v;
    }
    return ctx;
  }

  scopeLabel(scope?: string): string {
    if (scope === 'client') return 'client';
    if (scope === 'internal') return 'interne';
    return 'client + interne';
  }

  // --- Repli JSON (modèles avancés) ---
  jsonData(d: ProjectDocument): string {
    if (this.jsonCache) return this.jsonCache;
    return JSON.stringify(d.data ?? {}, null, 2);
  }
  setJsonData(d: ProjectDocument, raw: string) {
    this.jsonCache = raw;
    try {
      d.data = JSON.parse(raw || '{}');
      this.jsonError.set(false);
    } catch {
      this.jsonError.set(true);
    }
  }

  preview() {
    const d = this.doc();
    if (!d?.id) { this.toast.error('Enregistrez d\'abord le document.'); return; }
    this.previewing.set(true);
    this.service.update(d.id, d).subscribe({
      next: () => {
        this.service.preview(d.id!).subscribe({
          next: (r) => { this.previewing.set(false); this.previewSvc.open(r, d.title || 'Aperçu'); },
          error: () => { this.previewing.set(false); this.toast.error('Aperçu impossible.'); },
        });
      },
      error: () => { this.previewing.set(false); this.toast.error('Aperçu impossible.'); },
    });
  }

  /** Aperçu affiché en ligne dans l'onglet « Aperçu ». */
  refreshPreview() {
    const d = this.doc();
    if (!d?.id) { this.toast.error('Enregistrez d\'abord le document.'); return; }
    this.previewing.set(true);
    this.service.update(d.id, d).subscribe({
      next: () => {
        this.service.preview(d.id!).subscribe({
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
  ngOnDestroy() { if (this.previewUrl) URL.revokeObjectURL(this.previewUrl); }

  save() {
    const d = this.doc();
    if (!d) return;
    if (!d.title || !d.project || !d.template) {
      this.toast.error('Titre, projet et modèle sont obligatoires.');
      return;
    }
    if (this.jsonError()) {
      this.toast.error('Corrigez le JSON avant d\'enregistrer.');
      return;
    }
    this.saving.set(true);
    const req = this.isEdit() ? this.service.update(+this.id!, d) : this.service.create(d);
    req.subscribe({
      next: (saved) => {
        this.saving.set(false);
        this.toast.success('Document enregistré.');
        if (!this.isEdit()) {
          this.router.navigate(['/documents', saved.id]);
        } else {
          this.doc.set(saved);
        }
      },
      error: () => {
        this.saving.set(false);
        this.toast.error("Erreur lors de l'enregistrement.");
      },
    });
  }

  generate() {
    const d = this.doc();
    if (!d?.id) return;
    if (!this.gen.author_initials.trim()) {
      this.toast.error('Vos initiales sont obligatoires.');
      return;
    }
    this.generating.set(true);
    this.service
      .generate(d.id, {
        author_initials: this.gen.author_initials,
        author_name: this.gen.author_name,
        comment: this.gen.comment,
        confidentiality: d.confidentiality,
        data: d.data,
      })
      .subscribe({
        next: () => {
          this.generating.set(false);
          this.gen.comment = '';
          this.toast.success('Nouvelle version générée.');
          this.service.get(d.id!).subscribe((fresh) => this.doc.set(fresh));
        },
        error: () => {
          this.generating.set(false);
          this.toast.error('Erreur lors de la génération.');
        },
      });
  }

  restore(v: DocumentVersion) {
    const d = this.doc();
    if (!d?.id || !v.id) return;
    if (!confirm(`Restaurer la version v${v.versionNumber} ? Une nouvelle version en sera créée.`)) return;
    const initials = this.gen.author_initials.trim() || '—';
    this.service.restoreVersion(d.id, v.id, initials).subscribe({
      next: () => {
        this.toast.success(`Version v${v.versionNumber} restaurée.`);
        this.service.get(d.id!).subscribe((fresh) => this.doc.set(fresh));
      },
      error: () => this.toast.error('Restauration impossible.'),
    });
  }
}
