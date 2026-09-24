import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DocumentService } from '../../core/services/document.service';
import { ToastService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { PreviewService } from '../../core/services/preview.service';
import { Block, DocumentTemplate } from '../../core/models';

@Component({
  selector: 'app-template-list',
  imports: [RouterLink],
  template: `
    <div class="row between">
      <h1>Modèles de documents</h1>
      <a class="btn btn-primary" routerLink="/templates/new">+ Nouveau modèle</a>
    </div>
    <p class="muted">
      Un modèle décrit la structure d'un document : titres, textes fixes, champs
      à remplir, tableaux et contacts. Modifiez-les visuellement, sans code.
    </p>

    <div class="grid-cards">
      @for (t of templates(); track t.id) {
        <div class="card">
          <div class="row between">
            <strong>{{ t.name }}</strong>
            <span class="badge badge-type">{{ t.doc_type }}</span>
          </div>
          <p class="muted" style="min-height:2.4em">{{ t.description }}</p>
          <div class="tag">{{ blockCount(t) }} bloc(s)</div>
          <div class="row" style="gap:.4rem; margin-top:.6rem">
            @if (t.is_block_based || t.builder_key === 'excel_workbook') {
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
  `,
})
export class TemplateList {
  private service = inject(DocumentService);
  private toast = inject(ToastService);
  auth = inject(AuthService);
  private previewSvc = inject(PreviewService);
  canManage = () => this.auth.hasRole('admin') || this.auth.hasRole('manager') || !this.auth.user();

  templates = signal<DocumentTemplate[]>([]);

  constructor() {
    this.reload();
  }

  reload() {
    this.service.templates().subscribe((r) => this.templates.set(r.results));
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

  blockCount(t: DocumentTemplate): number {
    return (t.schema as Block[])?.length ?? 0;
  }

  remove(t: DocumentTemplate) {
    if (!confirm(`Supprimer le modèle « ${t.name} » ?`)) return;
    this.service.removeTemplate(t.id!).subscribe({
      next: () => {
        this.toast.success('Modèle supprimé.');
        this.reload();
      },
      error: () => this.toast.error('Suppression impossible (modèle utilisé ?).'),
    });
  }
}
