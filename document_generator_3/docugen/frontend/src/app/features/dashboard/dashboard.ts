import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ProjectService } from '../../core/services/project.service';
import { DocumentService } from '../../core/services/document.service';
import { FormService } from '../../core/services/form.service';

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink],
  template: `
    <div class="row between">
      <h1>Tableau de bord</h1>
    </div>
    <p class="muted">
      Bienvenue sur DocuGen. Créez des projets, générez des documents
      (PDF, Excel, Word) et partagez des formulaires en ligne.
    </p>

    <div class="grid-cards" style="margin-top: 1.5rem">
      <a class="card stat" routerLink="/projects">
        <div class="num">{{ projectCount() }}</div>
        <div class="lbl">📁 Projets</div>
      </a>
      <a class="card stat" routerLink="/documents">
        <div class="num">{{ documentCount() }}</div>
        <div class="lbl">📄 Documents</div>
      </a>
      <a class="card stat" routerLink="/forms">
        <div class="num">{{ formCount() }}</div>
        <div class="lbl">📝 Formulaires</div>
      </a>
      <a class="card stat" routerLink="/templates">
        <div class="num">{{ templateCount() }}</div>
        <div class="lbl">🧩 Modèles</div>
      </a>
    </div>

    <div class="card" style="margin-top: 1.5rem">
      <h3>Actions rapides</h3>
      <div class="row wrap" style="margin-top: 0.6rem">
        <a class="btn btn-primary" routerLink="/projects/new">+ Nouveau projet</a>
        <a class="btn btn-ghost" routerLink="/documents/new">+ Nouveau document</a>
        <a class="btn btn-ghost" routerLink="/forms/new">+ Nouveau formulaire</a>
        <a class="btn btn-ghost" routerLink="/company">Configurer mon entreprise</a>
      </div>
    </div>
  `,
  styles: [
    `
      .stat {
        text-decoration: none;
        color: inherit;
        transition: transform 0.12s;
      }
      .stat:hover {
        transform: translateY(-2px);
        text-decoration: none;
      }
      .num {
        font-size: 2.2rem;
        font-weight: 700;
        color: var(--primary);
      }
      .lbl {
        color: var(--muted);
        font-weight: 600;
      }
    `,
  ],
})
export class Dashboard {
  private projects = inject(ProjectService);
  private documents = inject(DocumentService);
  private forms = inject(FormService);

  projectCount = signal(0);
  documentCount = signal(0);
  formCount = signal(0);
  templateCount = signal(0);

  constructor() {
    this.projects.list().subscribe((r) => this.projectCount.set(r.count));
    this.documents.list().subscribe((r) => this.documentCount.set(r.count));
    this.forms.list().subscribe((r) => this.formCount.set(r.count));
    this.documents.templates().subscribe((r) => this.templateCount.set(r.count));
  }
}
