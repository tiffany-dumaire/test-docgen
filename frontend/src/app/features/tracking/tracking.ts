import { Component, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { MatTabsModule } from '@angular/material/tabs';
import { DocumentService } from '../../core/services/document.service';
import { FormService } from '../../core/services/form.service';
import { ToastService } from '../../core/services/api.service';
import { PreviewService } from '../../core/services/preview.service';
import { OnlineForm, ProjectDocument } from '../../core/models';

@Component({
  selector: 'app-tracking',
  imports: [FormsModule, RouterLink, DatePipe, MatTabsModule],
  template: `
    <div class="row between">
      <h1>Suivi général</h1>
      <div class="row" style="gap:.5rem">
        <a class="btn btn-ghost" routerLink="/documents/new"><span class="material-icons">note_add</span> Nouveau document</a>
        <a class="btn btn-primary" routerLink="/forms/new"><span class="material-icons">post_add</span> Nouveau formulaire</a>
      </div>
    </div>
    <p class="muted">Tous les documents générés et formulaires de l'ensemble des projets, regroupés pour un suivi transversal.</p>

    <div class="stats-row">
      <div class="mini-stat"><span class="ms-num">{{ documents().length }}</span><span class="ms-lbl">Documents</span></div>
      <div class="mini-stat"><span class="ms-num">{{ forms().length }}</span><span class="ms-lbl">Formulaires</span></div>
      <div class="mini-stat"><span class="ms-num">{{ totalSubmissions() }}</span><span class="ms-lbl">Réponses collectées</span></div>
    </div>

    <mat-tab-group class="detail-tabs" animationDuration="200ms" mat-stretch-tabs="false">
      <!-- Documents -->
      <mat-tab label="Documents ({{ documents().length }})">
        <div class="tabpad">
          <div class="card">
            <div class="row between" style="margin-bottom:.6rem">
              <input [(ngModel)]="docSearch" placeholder="Rechercher un document…" style="max-width:320px" />
              <a class="btn btn-sm btn-primary" routerLink="/documents/new"><span class="material-icons">note_add</span> Créer</a>
            </div>
            @if (filteredDocs().length) {
              <table>
                <thead><tr><th>Document</th><th>Projet</th><th>Type</th><th>Confidentialité</th><th>Version</th><th>Mis à jour</th><th></th></tr></thead>
                <tbody>
                  @for (d of filteredDocs(); track d.id) {
                    <tr>
                      <td><a [routerLink]="['/documents', d.id]">{{ d.title }}</a></td>
                      <td><a [routerLink]="['/projects', d.project]">{{ d.project_name }}</a></td>
                      <td><span class="badge badge-type">{{ d.doc_type }}</span></td>
                      <td><span class="badge" [class]="'badge-' + d.confidentiality">{{ d.confidentiality_display }}</span></td>
                      <td>v{{ d.current_version }}</td>
                      <td class="muted">{{ d.updated_at | date:'dd/MM/yy' }}</td>
                      <td><button class="btn btn-sm btn-ghost" (click)="previewDoc(d)">👁</button></td>
                    </tr>
                  }
                </tbody>
              </table>
            } @else { <div class="empty">Aucun document.</div> }
          </div>
        </div>
      </mat-tab>

      <!-- Formulaires -->
      <mat-tab label="Formulaires ({{ forms().length }})">
        <div class="tabpad">
          <div class="card">
            <div class="row between" style="margin-bottom:.6rem">
              <input [(ngModel)]="formSearch" placeholder="Rechercher un formulaire…" style="max-width:320px" />
              <a class="btn btn-sm btn-primary" routerLink="/forms/new"><span class="material-icons">post_add</span> Créer</a>
            </div>
            @if (filteredForms().length) {
              <table>
                <thead><tr><th>Formulaire</th><th>Projet</th><th>Modèle</th><th>État</th><th>Réponses</th><th>Lien</th></tr></thead>
                <tbody>
                  @for (f of filteredForms(); track f.id) {
                    <tr>
                      <td><a [routerLink]="['/forms', f.id]">{{ f.title }}</a></td>
                      <td>{{ projectName(f) }}</td>
                      <td>{{ f.template_name || '—' }}</td>
                      <td><span class="badge" [class]="f.is_open ? 'badge-public' : 'badge-restricted'">{{ f.is_open ? 'Ouvert' : 'Fermé' }}</span></td>
                      <td>{{ f.submission_count }}</td>
                      <td>@if (f.short_url) { <a [href]="f.short_url" target="_blank">lien</a> } @else { — }</td>
                    </tr>
                  }
                </tbody>
              </table>
            } @else { <div class="empty">Aucun formulaire.</div> }
          </div>
        </div>
      </mat-tab>
    </mat-tab-group>
  `,
  styles: [`
    .detail-tabs { margin-top: 1rem; }
    .tabpad { padding-top: 1.2rem; }
    .stats-row { display:flex; gap:1rem; flex-wrap:wrap; margin:1rem 0; }
    .mini-stat { flex:1; min-width:150px; background:var(--surface); border:1px solid var(--border); border-radius:16px; padding:1rem 1.2rem; box-shadow:var(--shadow); position:relative; overflow:hidden; }
    .mini-stat::before { content:''; position:absolute; inset:0 auto 0 0; width:5px; background:linear-gradient(180deg,#38BDF8,#6366F1); }
    .ms-num { display:block; font-size:1.8rem; font-weight:800; color:var(--dark); letter-spacing:-.02em; }
    .ms-lbl { color:var(--muted); font-size:.82rem; }
  `],
})
export class Tracking {
  private docSvc = inject(DocumentService);
  private formSvc = inject(FormService);
  private toast = inject(ToastService);
  private previewSvc = inject(PreviewService);

  documents = signal<ProjectDocument[]>([]);
  forms = signal<OnlineForm[]>([]);
  docSearch = '';
  formSearch = '';

  constructor() {
    this.docSvc.list().subscribe((r) => this.documents.set(r.results));
    this.formSvc.list().subscribe((r) => this.forms.set(r.results));
  }

  totalSubmissions = computed(() =>
    this.forms().reduce((s, f) => s + (f.submission_count || 0), 0));

  filteredDocs() {
    const q = this.docSearch.toLowerCase().trim();
    if (!q) return this.documents();
    return this.documents().filter((d) =>
      (d.title + ' ' + (d.project_name || '')).toLowerCase().includes(q));
  }
  filteredForms() {
    const q = this.formSearch.toLowerCase().trim();
    if (!q) return this.forms();
    return this.forms().filter((f) =>
      (f.title + ' ' + (f.template_name || '')).toLowerCase().includes(q));
  }
  projectName(f: OnlineForm): string {
    return (f as { project_name?: string }).project_name || '—';
  }

  previewDoc(d: ProjectDocument) {
    this.docSvc.preview(d.id!).subscribe({
      next: (r) => this.previewSvc.open(r, d.title),
      error: () => this.toast.error('Aperçu impossible.'),
    });
  }
}
