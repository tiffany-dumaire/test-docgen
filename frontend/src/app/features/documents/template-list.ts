import { Component, inject, signal, computed } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MatTabsModule } from '@angular/material/tabs';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { DocumentService } from '../../core/services/document.service';
import { FormService } from '../../core/services/form.service';
import { ToastService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { PreviewService } from '../../core/services/preview.service';
import { Block, DocumentTemplate, FormTemplate, LANGUAGES } from '../../core/models';

interface TypeTab { key: string; label: string; icon: string; }

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
];

@Component({
  selector: 'app-template-list',
  imports: [RouterLink, MatTabsModule, TranslocoModule],
  template: `
    <div class="row between">
      <h1>{{ 'nav.templates' | transloco }}</h1>
      <a class="btn btn-primary" routerLink="/templates/new">+ {{ 'templates.new' | transloco }}</a>
    </div>
    <p class="muted">{{ 'templates.subtitle' | transloco }}</p>
    <div class="row" style="gap:.5rem; align-items:center; margin-bottom:.4rem">
      <span class="tag">{{ 'templates.language' | transloco }} :</span>
      <button class="lang-pill" [class.active]="lang() === 'all'" (click)="lang.set('all')">{{ 'templates.all_langs' | transloco }}</button>
      @for (l of languages; track l.value) {
        <button class="lang-pill" [class.active]="lang() === l.value" (click)="lang.set(l.value)">{{ l.flag }} {{ l.label }}</button>
      }
    </div>

    <mat-tab-group class="detail-tabs" animationDuration="200ms" mat-stretch-tabs="false">
      @for (tab of typeTabs; track tab.key) {
        <mat-tab label="{{ tab.icon }} {{ tab.label }} ({{ byType(tab.key).length }})">
          <div class="tabpad">
            @if (byType(tab.key).length) {
              <div class="grid-cards">
                @for (t of byType(tab.key); track t.id) {
                  <div class="card">
                    <div class="row between">
                      <strong>{{ cardName(t) }}</strong>
                      <span class="badge badge-type">{{ cardFlag(t) }} {{ tab.label }}</span>
                    </div>
                    <p class="muted" style="min-height:2.4em">{{ t.description }}</p>
                    <div class="tag">{{ summary(t) }}</div>
                    <div class="row" style="gap:.4rem; margin-top:.6rem; flex-wrap:wrap">
                      @if (t.is_block_based || t.builder_key === 'excel_workbook' || t.doc_type === 'a3') {
                        <a class="btn btn-sm btn-ghost" [routerLink]="['/templates', t.id]">✏️ {{ 'common.edit' | transloco }}</a>
                      } @else {
                        <span class="tag">{{ 'templates.advanced' | transloco }}</span>
                      }
                      <button class="btn btn-sm btn-ghost" (click)="preview(t)">👁 {{ 'templates.preview' | transloco }}</button>
                      @if (t.doc_type === 'a3') {
                        <button class="btn btn-sm btn-ghost" (click)="exportA3(t, 'pdf')">⬇ PDF</button>
                        <button class="btn btn-sm btn-ghost" (click)="exportA3(t, 'png')">⬇ PNG</button>
                        <button class="btn btn-sm btn-ghost" (click)="exportA3(t, 'svg')">⬇ SVG</button>
                      }
                      <button class="btn btn-sm btn-ghost" (click)="duplicate(t)">⧉ {{ 'templates.duplicate' | transloco }}</button>
                      @if (!t.is_system) {
                        @if (canManage()) { <button class="btn btn-sm btn-danger" (click)="remove(t)">{{ 'templates.delete_short' | transloco }}</button> }
                      } @else {
                        <span class="tag">{{ 'templates.system' | transloco }}</span>
                      }
                    </div>
                  </div>
                }
              </div>
            } @else {
              <div class="empty">
                {{ 'templates.empty' | transloco: { type: tab.label } }}
                <a routerLink="/templates/new">{{ 'templates.create_one' | transloco }}</a>.
              </div>
            }
          </div>
        </mat-tab>
      }

      <!-- ============ FORMULAIRES (modèles de formulaire) ============ -->
      <mat-tab label="📋 {{ 'forms.title' | transloco }} ({{ filteredForms().length }})">
        <div class="tabpad">
          <div class="row between">
            <p class="muted" style="margin:0">{{ 'templates.forms_hint' | transloco }}</p>
            <a class="btn btn-sm btn-primary" routerLink="/form-templates/new">+ {{ 'templates.new_form_template' | transloco }}</a>
          </div>
          @if (filteredForms().length) {
            <div class="grid-cards" style="margin-top:1rem">
              @for (ft of filteredForms(); track ft.id) {
                <div class="card">
                  <div class="row between">
                    <strong>{{ ft.name }}</strong>
                    <span class="badge badge-type">{{ 'templates.form_badge' | transloco }}</span>
                  </div>
                  <p class="muted" style="min-height:2.4em">{{ ft.description }}</p>
                  <div class="tag">{{ 'templates.form_summary' | transloco: { q: ft.schema.length, d: ft.diagrams.length, f: ft.form_count } }}</div>
                  <div class="row" style="gap:.4rem; margin-top:.6rem; flex-wrap:wrap">
                    <a class="btn btn-sm btn-ghost" [routerLink]="['/form-templates', ft.id]">✏️ {{ 'common.edit' | transloco }}</a>
                    <button class="btn btn-sm btn-ghost" (click)="instantiate(ft)">＋ {{ 'templates.generate_form' | transloco }}</button>
                    @if (canManage()) { <button class="btn btn-sm btn-danger" (click)="removeForm(ft)">{{ 'templates.delete_short' | transloco }}</button> }
                  </div>
                </div>
              }
            </div>
          } @else {
            <div class="empty" style="margin-top:1rem">
              {{ 'templates.no_form_templates' | transloco }} <a routerLink="/form-templates/new">{{ 'templates.create_one' | transloco }}</a>.
            </div>
          }
        </div>
      </mat-tab>
    </mat-tab-group>
  `,
  styles: [`
    .detail-tabs { margin-top: .5rem; }
    .tabpad { padding-top: 1.2rem; }
    .lang-pill { border:1px solid var(--border-strong); background:var(--surface); border-radius:999px; padding:.2rem .7rem; cursor:pointer; font-size:.8rem; font-weight:600; }
    .lang-pill.active { background:var(--primary); color:#fff; border-color:var(--primary); }
  `],
})
export class TemplateList {
  private service = inject(DocumentService);
  private formSvc = inject(FormService);
  private toast = inject(ToastService);
  auth = inject(AuthService);
  private router = inject(Router);
  private previewSvc = inject(PreviewService);
  private t = inject(TranslocoService);
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
    this.service.templates({ page_size: 1000 }).subscribe((r) => this.templates.set(r.results));
    this.formSvc.templates({ page_size: 1000 }).subscribe((r) => this.formTemplates.set(r.results));
  }

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
