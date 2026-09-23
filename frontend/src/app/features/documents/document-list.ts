import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DocumentService } from '../../core/services/document.service';
import { ToastService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { ProjectDocument } from '../../core/models';

@Component({
  selector: 'app-document-list',
  imports: [RouterLink, FormsModule],
  template: `
    <div class="row between">
      <h1>Documents</h1>
      <a class="btn btn-primary" routerLink="/documents/new">+ Nouveau document</a>
    </div>

    <div class="card" style="margin-bottom:1rem">
      <input [(ngModel)]="search" (ngModelChange)="reload()" placeholder="Rechercher un document…" />
    </div>

    @if (documents().length) {
      <div class="card">
        <table>
          <thead>
            <tr>
              <th>Titre</th><th>Projet</th><th>Type</th>
              <th>Confidentialité</th><th>Version</th><th></th>
            </tr>
          </thead>
          <tbody>
            @for (d of documents(); track d.id) {
              <tr>
                <td><a [routerLink]="['/documents', d.id]">{{ d.title }}</a></td>
                <td>{{ d.project_name }}</td>
                <td><span class="badge badge-type">{{ d.doc_type }}</span></td>
                <td><span class="badge" [class]="'badge-' + d.confidentiality">{{ d.confidentiality_display }}</span></td>
                <td>v{{ d.current_version }}</td>
                <td class="row" style="gap:.4rem">
                  <a class="btn btn-sm btn-ghost" [routerLink]="['/documents', d.id]">Ouvrir</a>
                  <button class="btn btn-sm btn-ghost" (click)="duplicate(d)">⧉ Dupliquer</button>
                  @if (canManage()) { <button class="btn btn-sm btn-danger" (click)="remove(d)">Suppr.</button> }
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    } @else {
      <div class="empty">Aucun document. Créez-en un pour commencer.</div>
    }
  `,
})
export class DocumentList {
  private service = inject(DocumentService);
  private toast = inject(ToastService);
  auth = inject(AuthService);
  canManage = () => this.auth.hasRole('admin') || this.auth.hasRole('manager') || !this.auth.user();

  documents = signal<ProjectDocument[]>([]);
  search = '';

  constructor() {
    this.reload();
  }
  reload() {
    this.service.list({ search: this.search }).subscribe((r) => this.documents.set(r.results));
  }

  duplicate(d: ProjectDocument) {
    this.service.duplicateDocument(d.id!).subscribe({
      next: () => { this.toast.success('Document dupliqué.'); this.reload(); },
      error: () => this.toast.error('Duplication impossible.'),
    });
  }
  remove(d: ProjectDocument) {
    if (!confirm(`Supprimer « ${d.title} » et toutes ses versions ?`)) return;
    this.service.remove(d.id!).subscribe(() => {
      this.toast.success('Document supprimé.');
      this.reload();
    });
  }
}
