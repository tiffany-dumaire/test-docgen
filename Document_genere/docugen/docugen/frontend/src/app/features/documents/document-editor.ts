import { Component, inject, signal, Input, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DocumentService } from '../../core/services/document.service';
import { ProjectService } from '../../core/services/project.service';
import { ToastService } from '../../core/services/api.service';
import {
  Choice,
  DocumentTemplate,
  ProjectDocument,
  Project,
  SchemaField,
} from '../../core/models';

@Component({
  selector: 'app-document-editor',
  imports: [FormsModule, RouterLink, DatePipe],
  template: `
    <div class="row between">
      <h1>{{ isEdit() ? doc()?.title : 'Nouveau document' }}</h1>
      <a class="btn btn-ghost" routerLink="/documents">Retour</a>
    </div>

    @if (doc(); as d) {
      <div class="grid-2">
        <!-- Colonne édition -->
        <div class="stack">
          <div class="card stack">
            <h3>Paramètres</h3>
            <div class="field">
              <label>Titre *</label>
              <input [(ngModel)]="d.title" />
            </div>
            <div class="form-grid">
              <div class="field">
                <label>Projet *</label>
                <select [(ngModel)]="d.project" [disabled]="isEdit()">
                  <option [ngValue]="null" disabled>— choisir —</option>
                  @for (p of projects(); track p.id) {
                    <option [ngValue]="p.id">{{ p.name }} ({{ p.client_name }})</option>
                  }
                </select>
              </div>
              <div class="field">
                <label>Modèle *</label>
                <select [(ngModel)]="d.template" [disabled]="isEdit()" (ngModelChange)="onTemplateChange($event)">
                  <option [ngValue]="null" disabled>— choisir —</option>
                  @for (t of templates(); track t.id) {
                    <option [ngValue]="t.id">{{ t.name }}</option>
                  }
                </select>
              </div>
            </div>
            <div class="field">
              <label>Niveau de confidentialité</label>
              <select [(ngModel)]="d.confidentiality">
                @for (c of confidentialityLevels(); track c.value) {
                  <option [value]="c.value">{{ c.label }}</option>
                }
              </select>
            </div>
          </div>

          <!-- Variables du modèle -->
          @if (activeTemplate(); as tpl) {
            <div class="card stack">
              <h3>Variables — {{ tpl.name }}</h3>
              <p class="muted">{{ tpl.description }}</p>
              @for (f of tpl.schema; track f.key) {
                <div class="field">
                  <label>{{ f.label }} @if (f.required) { <span class="req">*</span> }</label>
                  @switch (fieldKind(f)) {
                    @case ('textarea') {
                      <textarea [ngModel]="strVal(d, f.key)" (ngModelChange)="setVal(d, f.key, $event)" rows="3"></textarea>
                    }
                    @case ('select') {
                      <select [ngModel]="strVal(d, f.key)" (ngModelChange)="setVal(d, f.key, $event)">
                        <option value="">—</option>
                        @for (opt of f.options ?? []; track opt) { <option [value]="opt">{{ opt }}</option> }
                      </select>
                    }
                    @case ('json') {
                      <textarea
                        class="mono"
                        [ngModel]="jsonVal(d, f.key)"
                        (ngModelChange)="setJson(d, f.key, $event)"
                        rows="6"
                      ></textarea>
                      <small>Format JSON. {{ jsonHint(f) }}</small>
                    }
                    @default {
                      <input
                        [type]="f.type === 'number' ? 'number' : (f.type === 'email' ? 'email' : (f.type === 'date' ? 'date' : 'text'))"
                        [ngModel]="strVal(d, f.key)"
                        (ngModelChange)="setVal(d, f.key, $event)"
                      />
                    }
                  }
                  @if (jsonErrors()[f.key]) { <small class="err">JSON invalide</small> }
                  @if (f.help) { <small>{{ f.help }}</small> }
                </div>
              }
            </div>
          }

          <div class="row" style="gap:.5rem">
            <button class="btn btn-primary" (click)="save()" [disabled]="saving()">
              {{ isEdit() ? 'Enregistrer' : 'Créer le document' }}
            </button>
          </div>
        </div>

        <!-- Colonne génération + historique -->
        <div class="stack">
          <div class="card stack">
            <h3>Générer une version</h3>
            @if (!isEdit()) {
              <p class="muted">Enregistrez d'abord le document, puis générez sa première version.</p>
            } @else {
              <div class="form-grid">
                <div class="field">
                  <label>Initiales de l'auteur *</label>
                  <input [(ngModel)]="gen.author_initials" maxlength="10" placeholder="ex : PM" />
                </div>
                <div class="field">
                  <label>Nom de l'auteur</label>
                  <input [(ngModel)]="gen.author_name" placeholder="Paul Martin" />
                </div>
              </div>
              <div class="field">
                <label>Commentaire de modification</label>
                <textarea [(ngModel)]="gen.comment" rows="2" placeholder="Ce qui a changé…"></textarea>
              </div>
              <button class="btn btn-primary" (click)="generate()" [disabled]="generating()">
                🖨️ {{ (doc()?.current_version ?? 0) > 0 ? 'Régénérer (nouvelle version)' : 'Générer la version 1' }}
              </button>
            }
          </div>

          <div class="card">
            <h3>Historique des versions</h3>
            @if (versions().length) {
              <table>
                <thead><tr><th>Ver.</th><th>Date</th><th>Auteur</th><th>Confid.</th><th>Commentaire</th><th></th></tr></thead>
                <tbody>
                  @for (v of versions(); track v.id) {
                    <tr>
                      <td>v{{ v.version_number }}</td>
                      <td>{{ v.created_at | date: 'dd/MM/yy HH:mm' }}</td>
                      <td>{{ v.author_initials }}</td>
                      <td><span class="badge" [class]="'badge-' + v.confidentiality">{{ v.confidentiality_display }}</span></td>
                      <td class="cmt">{{ v.comment || '—' }}</td>
                      <td>
                        @if (v.file_url) { <a class="btn btn-sm btn-ghost" [href]="v.file_url" target="_blank">⬇</a> }
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            } @else {
              <div class="muted">Aucune version générée.</div>
            }
          </div>
        </div>
      </div>
    }
  `,
  styles: [
    `
      .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; align-items: start; }
      @media (max-width: 900px) { .grid-2 { grid-template-columns: 1fr; } }
      .mono { font-family: ui-monospace, monospace; font-size: 0.8rem; }
      .req { color: var(--danger); }
      .err { color: var(--danger); }
      .cmt { max-width: 220px; }
    `,
  ],
})
export class DocumentEditor {
  private service = inject(DocumentService);
  private projectSvc = inject(ProjectService);
  private toast = inject(ToastService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  @Input() id?: string;

  doc = signal<ProjectDocument | null>(null);
  projects = signal<Project[]>([]);
  templates = signal<DocumentTemplate[]>([]);
  confidentialityLevels = signal<Choice[]>([]);
  jsonErrors = signal<Record<string, boolean>>({});
  saving = signal(false);
  generating = signal(false);

  gen = { author_initials: '', author_name: '', comment: '' };

  private jsonCache: Record<string, string> = {};

  activeTemplate = computed(() => {
    const d = this.doc();
    if (!d?.template) return null;
    return this.templates().find((t) => t.id === d.template) ?? null;
  });

  versions = computed(() => this.doc()?.versions ?? []);

  constructor() {
    this.projectSvc.list().subscribe((r) => this.projects.set(r.results));
    this.service.templates({ is_active: true }).subscribe((r) => this.templates.set(r.results));
    this.service.choices().subscribe((c) => this.confidentialityLevels.set(c.confidentiality_levels));

    setTimeout(() => {
      if (this.id) {
        this.service.get(+this.id).subscribe((d) => this.doc.set(d));
      } else {
        const preProject = this.route.snapshot.queryParamMap.get('project');
        this.doc.set({
          project: preProject ? +preProject : (null as unknown as number),
          template: null as unknown as number,
          title: '',
          confidentiality: 'internal',
          data: {},
        });
      }
    });
  }

  isEdit() {
    return !!this.id;
  }

  onTemplateChange(_: number) {
    // Réinitialise les erreurs JSON à la sélection d'un modèle
    this.jsonErrors.set({});
    this.jsonCache = {};
  }

  fieldKind(f: SchemaField): 'text' | 'textarea' | 'select' | 'json' {
    if (['sections', 'milestones', 'table', 'list'].includes(f.type)) return 'json';
    if (f.type === 'textarea') return 'textarea';
    if (f.type === 'select') return 'select';
    return 'text';
  }

  jsonHint(f: SchemaField): string {
    const hints: Record<string, string> = {
      sections: 'Ex : [{"heading":"Titre","content":"Texte"}]',
      milestones: 'Ex : [{"name":"Cadrage","due":"15/01/2026","status":"Terminé","owner":"PM"}]',
      table: 'Ex : {"columns":["A","B"],"rows":[["x","y"]]}',
      list: 'Ex : ["Point 1","Point 2"]',
    };
    return hints[f.type] ?? '';
  }

  strVal(d: ProjectDocument, key: string): string {
    const v = d.data[key];
    return v == null ? '' : String(v);
  }
  setVal(d: ProjectDocument, key: string, value: unknown) {
    d.data[key] = value;
  }

  jsonVal(d: ProjectDocument, key: string): string {
    if (key in this.jsonCache) return this.jsonCache[key];
    const v = d.data[key];
    return v == null ? '' : JSON.stringify(v, null, 2);
  }
  setJson(d: ProjectDocument, key: string, raw: string) {
    this.jsonCache[key] = raw;
    const errors = { ...this.jsonErrors() };
    if (!raw.trim()) {
      delete d.data[key];
      delete errors[key];
    } else {
      try {
        d.data[key] = JSON.parse(raw);
        delete errors[key];
      } catch {
        errors[key] = true;
      }
    }
    this.jsonErrors.set(errors);
  }

  save() {
    const d = this.doc();
    if (!d) return;
    if (!d.title || !d.project || !d.template) {
      this.toast.error('Titre, projet et modèle sont obligatoires.');
      return;
    }
    if (Object.values(this.jsonErrors()).some(Boolean)) {
      this.toast.error('Corrigez les champs JSON invalides.');
      return;
    }
    this.saving.set(true);
    const req = this.isEdit() ? this.service.update(+this.id!, d) : this.service.create(d);
    req.subscribe({
      next: (saved) => {
        this.saving.set(false);
        this.toast.success('Document enregistré.');
        if (!this.isEdit()) {
          this.router.navigate(['/documents', saved.id]);
        } else {
          this.doc.set(saved);
        }
      },
      error: () => {
        this.saving.set(false);
        this.toast.error("Erreur lors de l'enregistrement.");
      },
    });
  }

  generate() {
    const d = this.doc();
    if (!d?.id) return;
    if (!this.gen.author_initials.trim()) {
      this.toast.error("Les initiales de l'auteur sont obligatoires.");
      return;
    }
    this.generating.set(true);
    this.service
      .generate(d.id, {
        author_initials: this.gen.author_initials,
        author_name: this.gen.author_name,
        comment: this.gen.comment,
        confidentiality: d.confidentiality,
        data: d.data,
      })
      .subscribe({
        next: () => {
          this.generating.set(false);
          this.gen.comment = '';
          this.toast.success('Nouvelle version générée.');
          this.service.get(d.id!).subscribe((fresh) => this.doc.set(fresh));
        },
        error: () => {
          this.generating.set(false);
          this.toast.error('Erreur lors de la génération.');
        },
      });
  }
}
