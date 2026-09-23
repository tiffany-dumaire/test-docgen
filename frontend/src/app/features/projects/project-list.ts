import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ProjectService } from '../../core/services/project.service';
import { ToastService } from '../../core/services/api.service';
import { Project } from '../../core/models';

@Component({
  selector: 'app-project-list',
  imports: [RouterLink, FormsModule],
  template: `
    <div class="row between">
      <h1>Projets</h1>
      <a class="btn btn-primary" routerLink="/projects/new">+ Nouveau projet</a>
    </div>

    <div class="card" style="margin-bottom: 1rem">
      <input
        [(ngModel)]="search"
        (ngModelChange)="reload()"
        placeholder="Rechercher un projet, un client…"
      />
    </div>

    @if (projects().length) {
      <div class="card">
        <table>
          <thead>
            <tr>
              <th>Projet</th>
              <th>Client</th>
              <th>Référence</th>
              <th>Statut</th>
              <th>Documents</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            @for (p of projects(); track p.id) {
              <tr>
                <td><a [routerLink]="['/projects', p.id]">{{ p.name }}</a></td>
                <td>{{ p.client_name }}</td>
                <td>{{ p.reference || '—' }}</td>
                <td><span class="tag">{{ statusLabel(p.status) }}</span></td>
                <td>{{ p.document_count }}</td>
                <td class="row" style="gap:.4rem">
                  <a class="btn btn-sm btn-ghost" [routerLink]="['/projects', p.id, 'edit']">Éditer</a>
                  <button class="btn btn-sm btn-danger" (click)="remove(p)">Suppr.</button>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    } @else {
      <div class="empty">Aucun projet. Créez-en un pour commencer.</div>
    }
  `,
})
export class ProjectList {
  private service = inject(ProjectService);
  private toast = inject(ToastService);

  projects = signal<Project[]>([]);
  search = '';

  constructor() {
    this.reload();
  }

  reload() {
    this.service.list({ search: this.search }).subscribe((r) => this.projects.set(r.results));
  }

  statusLabel(s: string) {
    const labels: Record<string, string> = {
      active: 'Actif',
      on_hold: 'En pause',
      archived: 'Archivé',
    };
    return labels[s] ?? s;
  }

  remove(p: Project) {
    if (!confirm(`Supprimer le projet « ${p.name} » et ses documents ?`)) return;
    this.service.remove(p.id!).subscribe(() => {
      this.toast.success('Projet supprimé.');
      this.reload();
    });
  }
}
