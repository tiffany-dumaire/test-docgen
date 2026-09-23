import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DocumentService } from '../../core/services/document.service';
import { ToastService } from '../../core/services/api.service';
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
            @if (t.is_block_based) {
              <a class="btn btn-sm btn-ghost" [routerLink]="['/templates', t.id]">✏️ Éditer</a>
            } @else {
              <span class="tag">modèle avancé</span>
            }
            @if (!t.is_system) {
              <button class="btn btn-sm btn-danger" (click)="remove(t)">Suppr.</button>
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

  templates = signal<DocumentTemplate[]>([]);

  constructor() {
    this.reload();
  }

  reload() {
    this.service.templates().subscribe((r) => this.templates.set(r.results));
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
