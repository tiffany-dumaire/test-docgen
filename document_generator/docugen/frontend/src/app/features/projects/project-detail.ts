import { Component, inject, signal, Input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ProjectService } from '../../core/services/project.service';
import { DocumentService } from '../../core/services/document.service';
import { FormService } from '../../core/services/form.service';
import { OnlineForm, Project, ProjectDocument } from '../../core/models';

@Component({
  selector: 'app-project-detail',
  imports: [RouterLink],
  template: `
    @if (project(); as p) {
      <div class="row between">
        <div>
          <h1>{{ p.name }}</h1>
          <div class="muted">{{ p.client_name }} · {{ p.reference || 'sans référence' }}</div>
        </div>
        <div class="row" style="gap:.5rem">
          <a class="btn btn-ghost" [routerLink]="['/projects', p.id, 'edit']">Éditer</a>
          <a class="btn btn-primary" [routerLink]="['/documents/new']" [queryParams]="{ project: p.id }">
            + Document
          </a>
        </div>
      </div>

      @if (p.description) {
        <div class="card" style="margin-top:1rem"><p>{{ p.description }}</p></div>
      }

      <div class="grid-cards" style="margin-top:1rem">
        <div class="card">
          <h3>👤 Contacts client</h3>
          @for (c of clientContacts(p); track c.id) {
            <div class="contact">
              <strong>{{ c.full_name }}</strong>
              <div class="muted">{{ c.role }}</div>
              <div class="tag">{{ c.email }} · {{ c.phone }}</div>
            </div>
          } @empty {
            <div class="muted">Aucun contact client.</div>
          }
        </div>
        <div class="card">
          <h3>🧑‍💼 Contacts internes</h3>
          @for (c of internalContacts(p); track c.id) {
            <div class="contact">
              <strong>{{ c.full_name }}</strong>
              <div class="muted">{{ c.role }}</div>
              <div class="tag">{{ c.email }} · {{ c.phone }}</div>
            </div>
          } @empty {
            <div class="muted">Aucun contact interne.</div>
          }
        </div>
      </div>

      <div class="card" style="margin-top:1rem">
        <div class="row between">
          <h3>📄 Documents</h3>
          <a class="btn btn-sm btn-primary" [routerLink]="['/documents/new']" [queryParams]="{ project: p.id }">
            + Nouveau
          </a>
        </div>
        @if (documents().length) {
          <table>
            <thead>
              <tr><th>Titre</th><th>Type</th><th>Confidentialité</th><th>Version</th><th></th></tr>
            </thead>
            <tbody>
              @for (d of documents(); track d.id) {
                <tr>
                  <td><a [routerLink]="['/documents', d.id]">{{ d.title }}</a></td>
                  <td><span class="badge badge-type">{{ d.doc_type }}</span></td>
                  <td><span class="badge" [class]="'badge-' + d.confidentiality">{{ d.confidentiality_display }}</span></td>
                  <td>v{{ d.current_version }}</td>
                  <td><a class="btn btn-sm btn-ghost" [routerLink]="['/documents', d.id]">Ouvrir</a></td>
                </tr>
              }
            </tbody>
          </table>
        } @else {
          <div class="muted">Aucun document pour ce projet.</div>
        }
      </div>

      <div class="card" style="margin-top:1rem">
        <h3>📝 Formulaires liés</h3>
        @if (forms().length) {
          <table>
            <thead><tr><th>Titre</th><th>Lien réduit</th><th>Réponses</th></tr></thead>
            <tbody>
              @for (f of forms(); track f.id) {
                <tr>
                  <td><a [routerLink]="['/forms', f.id]">{{ f.title }}</a></td>
                  <td><a [href]="f.short_url" target="_blank">{{ f.short_url }}</a></td>
                  <td>{{ f.submission_count }}</td>
                </tr>
              }
            </tbody>
          </table>
        } @else {
          <div class="muted">Aucun formulaire lié.</div>
        }
      </div>
    }
  `,
  styles: [
    `
      .contact {
        padding: 0.5rem 0;
        border-bottom: 1px solid var(--border);
      }
      .contact:last-child {
        border-bottom: none;
      }
    `,
  ],
})
export class ProjectDetail {
  private projects = inject(ProjectService);
  private documentsSvc = inject(DocumentService);
  private formsSvc = inject(FormService);

  @Input() id!: string;
  project = signal<Project | null>(null);
  documents = signal<ProjectDocument[]>([]);
  forms = signal<OnlineForm[]>([]);

  constructor() {
    setTimeout(() => {
      const pid = +this.id;
      this.projects.get(pid).subscribe((p) => this.project.set(p));
      this.documentsSvc.list({ project: pid }).subscribe((r) => this.documents.set(r.results));
      this.formsSvc.list({ project: pid }).subscribe((r) => this.forms.set(r.results));
    });
  }

  clientContacts(p: Project) {
    return p.contacts.filter((c) => c.kind === 'client');
  }
  internalContacts(p: Project) {
    return p.contacts.filter((c) => c.kind === 'internal');
  }
}
