import { Component, inject, signal, computed } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MatTabsModule } from '@angular/material/tabs';
import { DocumentService } from '../../core/services/document.service';
import { FormService } from '../../core/services/form.service';
import { ToastService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { PreviewService } from '../../core/services/preview.service';
import { Block, DocumentTemplate, FormTemplate } from '../../core/models';

interface TypeTab { key: string; label: string; icon: string; }

const TYPE_TABS: TypeTab[] = [
  { key: 'docx', label: 'Word', icon: '📝' },
  { key: 'pdf', label: 'PDF', icon: '📄' },
  { key: 'xlsx', label: 'Excel', icon: '📊' },
  { key: 'a3', label: 'Template A3', icon: '🖼️' },
  { key: 'md', label: 'Markdown', icon: 'M↓' },
  { key: 'pptx', label: 'PowerPoint', icon: '📽️' },
];

@Component({
  selector: 'app-template-list',
  imports: [RouterLink, MatTabsModule],
  template: `
    <div class="row between">
      <h1>Modèles</h1>
      <a class="btn btn-primary" routerLink="/templates/new">+ Nouveau modèle</a>
    </div>
    <p class="muted">
      La configuration des modèles est séparée par onglet selon leur type :
      Word, PDF, Excel, Template A3 (PNG / PDF), Markdown, PowerPoint et Formulaires.
    </p>

    <mat-tab-group class="detail-tabs" animationDuration="200ms" mat-stretch-tabs="false">
      @for (tab of typeTabs; track tab.key) {
        <mat-tab label="{{ tab.icon }} {{ tab.label }} ({{ byType(tab.key).length }})">
          <div class="tabpad">
            @if (byType(tab.key).length) {
              <div class="grid-cards">
                @for (t of byType(tab.key); track t.id) {
                  <div class="card">
                    <div class="row between">
                      <strong>{{ t.name }}</strong>
                      <span class="badge badge-type">{{ tab.label }}</span>
                    </div>
                    <p class="muted" style="min-height:2.4em">{{ t.description }}</p>
                    <div class="tag">{{ summary(t) }}</div>
                    <div class="row" style="gap:.4rem; margin-top:.6rem; flex-wrap:wrap">
                      @if (t.is_block_based || t.builder_key === 'excel_workbook' || t.doc_type === 'a3') {
                        <a class="btn btn-sm btn-ghost" [routerLink]="['/templates', t.id]">✏️ Éditer</a>
                      } @else {
                        <span class="tag">modèle avancé</span>
                      }
                      <button class="btn btn-sm btn-ghost" (click)="preview(t)">👁 Aperçu</button>
                      <button class="btn btn-sm btn-ghost" (click)="duplicate(t)">⧉ Dupliquer</button>
                      @if (!t.is_system) {
                        @if (canManage()) { <button class="btn btn-sm btn-danger" (click)="remove(t)">Suppr.</button> }
                      } @else {
                        <span class="tag">système</span>
                      }
                    </div>
                  </div>
                }
              </div>
            } @else {
              <div class="empty">
                Aucun modèle {{ tab.label }}.
                <a routerLink="/templates/new">Créez-en un</a>.
              </div>
            }
          </div>
        </mat-tab>
      }

      <!-- ============ FORMULAIRES (modèles de formulaire) ============ -->
      <mat-tab label="📋 Formulaires ({{ formTemplates().length }})">
        <div class="tabpad">
          <div class="row between">
            <p class="muted" style="margin:0">
              Modèles de formulaire réutilisables (questions + diagrammes). Générez un
              formulaire en ligne depuis un projet ou directement ici.
            </p>
            <a class="btn btn-sm btn-primary" routerLink="/form-templates/new">+ Nouveau modèle de formulaire</a>
          </div>
          @if (formTemplates().length) {
            <div class="grid-cards" style="margin-top:1rem">
              @for (ft of formTemplates(); track ft.id) {
                <div class="card">
                  <div class="row between">
                    <strong>{{ ft.name }}</strong>
                    <span class="badge badge-type">Formulaire</span>
                  </div>
                  <p class="muted" style="min-height:2.4em">{{ ft.description }}</p>
                  <div class="tag">{{ ft.schema.length }} question(s) · {{ ft.diagrams.length }} diagramme(s) · {{ ft.form_count }} formulaire(s)</div>
                  <div class="row" style="gap:.4rem; margin-top:.6rem; flex-wrap:wrap">
                    <a class="btn btn-sm btn-ghost" [routerLink]="['/form-templates', ft.id]">✏️ Éditer</a>
                    <button class="btn btn-sm btn-ghost" (click)="instantiate(ft)">＋ Générer un formulaire</button>
                    @if (canManage()) { <button class="btn btn-sm btn-danger" (click)="removeForm(ft)">Suppr.</button> }
                  </div>
                </div>
              }
            </div>
          } @else {
            <div class="empty" style="margin-top:1rem">
              Aucun modèle de formulaire. <a routerLink="/form-templates/new">Créez-en un</a>.
            </div>
          }
        </div>
      </mat-tab>
    </mat-tab-group>
  `,
  styles: [`
    .detail-tabs { margin-top: .5rem; }
    .tabpad { padding-top: 1.2rem; }
  `],
})
export class TemplateList {
  private service = inject(DocumentService);
  private formSvc = inject(FormService);
  private toast = inject(ToastService);
  auth = inject(AuthService);
  private router = inject(Router);
  private previewSvc = inject(PreviewService);
  canManage = () => this.auth.hasRole('admin') || this.auth.hasRole('manager') || !this.auth.user();

  typeTabs = TYPE_TABS;
  templates = signal<DocumentTemplate[]>([]);
  formTemplates = signal<FormTemplate[]>([]);

  constructor() {
    this.reload();
  }

  reload() {
    this.service.templates().subscribe((r) => this.templates.set(r.results));
    this.formSvc.templates().subscribe((r) => this.formTemplates.set(r.results));
  }

  byType(key: string): DocumentTemplate[] {
    return this.templates().filter((t) => t.doc_type === key);
  }

  summary(t: DocumentTemplate): string {
    if (t.doc_type === 'xlsx') return `${t.settings?.excel?.sheets?.length ?? 0} onglet(s)`;
    if (t.doc_type === 'a3') return `${t.settings?.a3_pages?.length ?? 0} page(s) · ${t.settings?.a3_export === 'png' ? 'PNG' : 'PDF'}`;
    return `${(t.schema as Block[])?.length ?? 0} bloc(s)`;
  }

  preview(t: DocumentTemplate) {
    this.toast.success('Génération de l\'aperçu…');
    this.service.previewTemplate(t.id!).subscribe({
      next: (r) => this.previewSvc.open(r, t.name),
      error: () => this.toast.error('Aperçu impossible.'),
    });
  }
  duplicate(t: DocumentTemplate) {
    this.service.duplicateTemplate(t.id!).subscribe({
      next: () => { this.toast.success('Modèle dupliqué.'); this.reload(); },
      error: () => this.toast.error('Duplication impossible.'),
    });
  }
  remove(t: DocumentTemplate) {
    if (!confirm(`Supprimer le modèle « ${t.name} » ?`)) return;
    this.service.removeTemplate(t.id!).subscribe({
      next: () => { this.toast.success('Modèle supprimé.'); this.reload(); },
      error: () => this.toast.error('Suppression impossible (modèle utilisé ?).'),
    });
  }

  instantiate(ft: FormTemplate) {
    this.formSvc.instantiate(ft.id!, { title: ft.name }).subscribe({
      next: (form) => { this.toast.success('Formulaire généré.'); this.router.navigate(['/forms', form.id]); },
      error: () => this.toast.error('Génération impossible.'),
    });
  }
  removeForm(ft: FormTemplate) {
    if (!confirm(`Supprimer le modèle de formulaire « ${ft.name} » ?`)) return;
    this.formSvc.removeTemplate(ft.id!).subscribe({
      next: () => { this.toast.success('Modèle supprimé.'); this.reload(); },
      error: () => this.toast.error('Suppression impossible.'),
    });
  }
}
