import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { TranslocoModule } from '@jsverse/transloco';
import { ProjectService } from '../../core/services/project.service';
import { DocumentService } from '../../core/services/document.service';
import { FormService } from '../../core/services/form.service';

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, MatIconModule, MatButtonModule, TranslocoModule],
  template: `
    <h1>{{ 'nav.dashboard' | transloco }}</h1>
    <p class="muted">{{ 'dash.subtitle' | transloco }}</p>

    <div class="stats">
      <a class="stat" routerLink="/projects">
        <div class="ic ic1"><mat-icon>folder</mat-icon></div>
        <div class="meta"><div class="num">{{ projectCount() }}</div><div class="lbl">{{ 'nav.projects' | transloco }}</div></div>
      </a>
      <a class="stat" routerLink="/documents">
        <div class="ic ic2"><mat-icon>description</mat-icon></div>
        <div class="meta"><div class="num">{{ documentCount() }}</div><div class="lbl">{{ 'nav.documents' | transloco }}</div></div>
      </a>
      <a class="stat" routerLink="/forms">
        <div class="ic ic3"><mat-icon>assignment</mat-icon></div>
        <div class="meta"><div class="num">{{ formCount() }}</div><div class="lbl">{{ 'nav.forms' | transloco }}</div></div>
      </a>
      <a class="stat" routerLink="/templates">
        <div class="ic ic4"><mat-icon>grid_view</mat-icon></div>
        <div class="meta"><div class="num">{{ templateCount() }}</div><div class="lbl">{{ 'nav.templates' | transloco }}</div></div>
      </a>
    </div>

    <div class="quick">
      <h3><mat-icon>bolt</mat-icon> {{ 'dash.quick' | transloco }}</h3>
      <div class="qgrid">
        <a mat-flat-button color="primary" routerLink="/projects/new"><mat-icon>add</mat-icon> {{ 'dash.new_project' | transloco }}</a>
        <a mat-stroked-button routerLink="/documents/new"><mat-icon>note_add</mat-icon> {{ 'dash.new_document' | transloco }}</a>
        <a mat-stroked-button routerLink="/forms/new"><mat-icon>post_add</mat-icon> {{ 'dash.new_form' | transloco }}</a>
        <a mat-stroked-button routerLink="/company"><mat-icon>business</mat-icon> {{ 'nav.company' | transloco }}</a>
      </div>
    </div>
  `,
  styles: [`
    .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 1.1rem; margin: 1.5rem 0; }
    .stat { display: flex; align-items: center; gap: 1rem; padding: 1.15rem 1.25rem; text-decoration: none; color: inherit;
      background: var(--mat-sys-surface); border: 1px solid var(--mat-sys-outline-variant); border-radius: 18px;
      box-shadow: 0 1px 2px rgba(15,23,42,.04), 0 8px 22px rgba(15,23,42,.05);
      transition: transform .16s ease, box-shadow .18s ease; }
    .stat:hover { transform: translateY(-4px); box-shadow: 0 12px 30px rgba(15,23,42,.12); text-decoration: none; }
    .ic { width: 54px; height: 54px; border-radius: 15px; display: grid; place-items: center; flex: none; color: #fff; }
    .ic mat-icon { font-size: 28px; width: 28px; height: 28px; }
    .ic1 { background: linear-gradient(135deg, var(--brand,#7c6cf0), #a78bfa); }
    .ic2 { background: linear-gradient(135deg, #0ea5e9, #22d3ee); }
    .ic3 { background: linear-gradient(135deg, #f59e0b, #fbbf24); }
    .ic4 { background: linear-gradient(135deg, #10b981, #34d399); }
    .num { font-size: 2rem; font-weight: 800; line-height: 1; letter-spacing: -.02em; }
    .lbl { color: var(--mat-sys-outline); font-weight: 600; margin-top: .25rem; }
    .quick { background: var(--mat-sys-surface); border: 1px solid var(--mat-sys-outline-variant); border-radius: 18px; padding: 1.3rem 1.4rem; }
    .quick h3 { display: flex; align-items: center; gap: .4rem; margin: 0 0 1rem; }
    .qgrid { display: flex; flex-wrap: wrap; gap: .7rem; }
    .qgrid a { text-decoration: none; }
  `],
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
