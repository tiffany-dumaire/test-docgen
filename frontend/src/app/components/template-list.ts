import { Component, inject, signal, computed } from '@angular/core';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { Router, RouterLink } from '@angular/router';
import { MatTabsModule } from '@angular/material/tabs';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { DocumentService } from '@core/services/document.service';
import { FormService } from '@core/services/form.service';
import { ToastService } from '@core/services/api.service';
import { AuthService } from '@core/auth/auth.service';
import { PreviewService } from '@core/services/preview.service';
import { Block, DocumentTemplate, FormTemplate, LANGUAGES } from '@core/models';
import { FormSchemaEditor } from '@shared/fields/form-schema-editor';

interface TypeTab { key: string; label: string; icon: string; }

const TYPE_COLORS: Record<string, string> = {
  docx: 'var(--doc-word)', pdf: 'var(--doc-pdf)', xlsx: 'var(--doc-xls)',
  a3: 'var(--doc-a3)', md: 'var(--doc-md)', pptx: 'var(--doc-ppt)',
  brochure: 'var(--doc-word)', lettre: 'var(--doc-letter)', mail: 'var(--doc-mail)',
  offre: 'var(--doc-stats)',
};

const TYPE_TABS: TypeTab[] = [
  { key: 'docx', label: 'Word', icon: '📝' },
  { key: 'pdf', label: 'PDF', icon: '📄' },
  { key: 'xlsx', label: 'Excel', icon: '📊' },
  { key: 'a3', label: 'Template A3', icon: '🖼️' },
  { key: 'md', label: 'Markdown', icon: 'M↓' },
  { key: 'pptx', label: 'PowerPoint', icon: '📽️' },
  { key: 'brochure', label: 'Brochure', icon: '📕' },
  { key: 'lettre', label: 'Lettre', icon: '✉️' },
  { key: 'mail', label: 'Mail', icon: '📧' },
  { key: 'offre', label: 'Offre', icon: '💼' },
];

@Component({
  selector: 'app-template-list',
  imports: [RouterLink, MatTabsModule, TranslocoModule],
  templateUrl: './template-list.html',
  styleUrl: './template-list.scss',
})
export class TemplateList {
  private service = inject(DocumentService);
  private formSvc = inject(FormService);
  private toast = inject(ToastService);
  auth = inject(AuthService);
  private router = inject(Router);
  private previewSvc = inject(PreviewService);
  private san = inject(DomSanitizer);
  private t = inject(TranslocoService);

  /** Vignettes SVG des modèles A3, indexées par id. */
  thumbs = signal<Record<number, SafeUrl>>({});
  private thumbUrls: string[] = [];
  canManage = () => this.auth.hasRole('admin') || this.auth.hasRole('manager') || !this.auth.user();

  typeTabs = TYPE_TABS;
  templates = signal<DocumentTemplate[]>([]);
  formTemplates = signal<FormTemplate[]>([]);
  languages = LANGUAGES;
  lang = signal<string>('all');

  constructor() {
    this.reload();
  }

  reload() {
    this.service.templates({ page_size: 1000 }).subscribe((r) => {
      this.templates.set(r.results);
      // Vignettes A3 : rendu SVG affiché directement sur les cartes.
      this.thumbs.set({});
      this.revokeThumbs();
      r.results.filter((t) => t.doc_type === 'a3').forEach((t) => this.loadA3Thumb(t));
    });
    this.formSvc.templates({ page_size: 1000 }).subscribe((r) => this.formTemplates.set(r.results));
  }

  private loadA3Thumb(t: DocumentTemplate) {
    if (!t.id) return;
    this.service.exportA3(t.id, 'svg').subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        this.thumbUrls.push(url);
        this.thumbs.update((m) => ({ ...m, [t.id!]: this.san.bypassSecurityTrustUrl(url) }));
      },
      error: () => { /* pas de vignette : repli sur l'icône */ },
    });
  }
  private revokeThumbs() {
    this.thumbUrls.forEach((u) => URL.revokeObjectURL(u));
    this.thumbUrls = [];
  }
  ngOnDestroy() { this.revokeThumbs(); }

  /** Langues proposées par un modèle (principale + langues additionnelles). */
  private langsOf(t: { language?: string; languages?: string[]; available_languages?: string[] }): string[] {
    if (t.available_languages?.length) return t.available_languages;
    const set = new Set<string>([...(t.languages ?? [])]);
    set.add(t.language || 'fr');
    return [...set];
  }
  byType(key: string): DocumentTemplate[] {
    const l = this.lang();
    return this.templates().filter((t) => t.doc_type === key &&
      (l === 'all' || this.langsOf(t).includes(l)));
  }
  langFlag(code?: string): string {
    return LANGUAGES.find((l) => l.value === code)?.flag ?? '🇫🇷';
  }
  /** Drapeau à afficher sur la carte : la langue filtrée, sinon la principale. */
  cardFlag(t: DocumentTemplate): string {
    const l = this.lang();
    return this.langFlag(l !== 'all' ? l : (t.language || 'fr'));
  }
  /** Nom du modèle dans la langue filtrée (sinon nom résolu / principal). */
  cardName(t: DocumentTemplate): string {
    const l = this.lang();
    if (l !== 'all' && t.names && t.names[l]) return t.names[l];
    return t.display_name || t.name;
  }
  filteredForms(): FormTemplate[] {
    const l = this.lang();
    return this.formTemplates().filter((t) => l === 'all' || this.langsOf(t).includes(l));
  }

  colorFor(key: string): string { return TYPE_COLORS[key] || 'var(--mat-sys-primary)'; }
  qCount(ft: FormTemplate): number {
    return FormSchemaEditor.questions(FormSchemaEditor.toSections((ft.schema || []) as any[])).length;
  }

  summary(t: DocumentTemplate): string {
    if (t.doc_type === 'xlsx') return `${t.settings?.excel?.sheets?.length ?? 0} onglet(s)`;
    if (t.doc_type === 'a3') return `${t.settings?.a3_pages?.length ?? 0} page(s) · ${t.settings?.a3_export === 'png' ? 'PNG' : 'PDF'}`;
    return `${(t.schema as Block[])?.length ?? 0} bloc(s)`;
  }

  preview(t: DocumentTemplate) {
    this.toast.success(this.t.translate('documents.previewing'));
    this.service.previewTemplate(t.id!).subscribe({
      next: (r) => this.previewSvc.open(r, t.display_name || t.name),
      error: () => this.toast.error(this.t.translate('documents.preview_error')),
    });
  }
  exportA3(t: DocumentTemplate, fmt: 'pdf' | 'png' | 'svg') {
    this.service.exportA3(t.id!, fmt).subscribe({
      next: (blob) => {
        const u = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = u; a.download = `${t.slug || 'template'}.${fmt}`;
        a.click(); URL.revokeObjectURL(u);
      },
      error: () => this.toast.error(this.t.translate('templates.export_error')),
    });
  }
  duplicate(t: DocumentTemplate) {
    this.service.duplicateTemplate(t.id!).subscribe({
      next: () => { this.toast.success(this.t.translate('templates.duplicated')); this.reload(); },
      error: () => this.toast.error(this.t.translate('documents.duplicate_error')),
    });
  }
  remove(t: DocumentTemplate) {
    if (!confirm(this.t.translate('templates.confirm_delete', { name: t.display_name || t.name }))) return;
    this.service.removeTemplate(t.id!).subscribe({
      next: () => { this.toast.success(this.t.translate('templates.deleted')); this.reload(); },
      error: () => this.toast.error(this.t.translate('templates.delete_error')),
    });
  }

  instantiate(ft: FormTemplate) {
    this.formSvc.instantiate(ft.id!, { title: ft.name }).subscribe({
      next: (form) => { this.toast.success(this.t.translate('templates.form_generated')); this.router.navigate(['/forms', form.id]); },
      error: () => this.toast.error(this.t.translate('templates.form_generate_error')),
    });
  }
  removeForm(ft: FormTemplate) {
    if (!confirm(this.t.translate('templates.confirm_delete_form', { name: ft.name }))) return;
    this.formSvc.removeTemplate(ft.id!).subscribe({
      next: () => { this.toast.success(this.t.translate('templates.deleted')); this.reload(); },
      error: () => this.toast.error(this.t.translate('templates.delete_error')),
    });
  }
}
