import { Component, inject, signal, Input, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormService } from '../../core/services/form.service';
import { ProjectService } from '../../core/services/project.service';
import { DocumentService } from '../../core/services/document.service';
import { ToastService } from '../../core/services/api.service';
import {
  Choice,
  FormField,
  FormSubmission,
  OnlineForm,
  Project,
} from '../../core/models';

@Component({
  selector: 'app-form-builder',
  imports: [FormsModule, RouterLink, DatePipe],
  template: `
    <div class="row between">
      <h1>{{ isEdit() ? 'Gérer le formulaire' : 'Nouveau formulaire' }}</h1>
      <a class="btn btn-ghost" routerLink="/forms">Retour</a>
    </div>

    @if (model(); as m) {
      <div class="grid-2">
        <div class="stack">
          <div class="card stack">
            <div class="field">
              <label>Titre *</label>
              <input [(ngModel)]="m.title" />
            </div>
            <div class="field">
              <label>Description</label>
              <textarea [(ngModel)]="m.description" rows="2"></textarea>
            </div>
            <div class="form-grid">
              <div class="field">
                <label>Projet lié</label>
                <select [(ngModel)]="m.project">
                  <option [ngValue]="null">— aucun —</option>
                  @for (p of projects(); track p.id) { <option [ngValue]="p.id">{{ p.name }}</option> }
                </select>
              </div>
              <div class="field">
                <label>Confidentialité</label>
                <select [(ngModel)]="m.confidentiality">
                  @for (c of confidentialityLevels(); track c.value) { <option [value]="c.value">{{ c.label }}</option> }
                </select>
              </div>
            </div>
            <div class="field">
              <label>Message de confirmation</label>
              <input [(ngModel)]="m.success_message" />
            </div>
            <label class="row" style="gap:.5rem; font-weight:600">
              <input type="checkbox" [(ngModel)]="m.is_open" style="width:auto" />
              Ouvert aux réponses
            </label>
          </div>

          <div class="card stack">
            <div class="row between">
              <h3>Champs du formulaire</h3>
              <button class="btn btn-sm btn-ghost" (click)="addField(m)">+ Champ</button>
            </div>
            @for (f of m.schema; track $index) {
              <div class="field-row">
                <input [(ngModel)]="f.label" placeholder="Libellé" (ngModelChange)="syncKey(f)" />
                <select [(ngModel)]="f.type">
                  <option value="text">Texte</option>
                  <option value="textarea">Texte long</option>
                  <option value="email">Email</option>
                  <option value="number">Nombre</option>
                  <option value="date">Date</option>
                  <option value="select">Liste déroulante</option>
                  <option value="checkbox">Case à cocher</option>
                </select>
                <label class="chk"><input type="checkbox" [(ngModel)]="f.required" /> Requis</label>
                <button class="btn btn-sm btn-danger" (click)="removeField(m, $index)">✕</button>
                @if (f.type === 'select') {
                  <input
                    class="opts"
                    [ngModel]="(f.options ?? []).join(', ')"
                    (ngModelChange)="setOptions(f, $event)"
                    placeholder="Options séparées par des virgules"
                  />
                }
              </div>
            }
            @if (!m.schema.length) { <small>Aucun champ. Ajoutez-en un.</small> }
          </div>

          <button class="btn btn-primary" (click)="save()" [disabled]="saving()">
            {{ isEdit() ? 'Enregistrer' : 'Créer le formulaire' }}
          </button>
        </div>

        <div class="stack">
          @if (isEdit() && m.short_url) {
            <div class="card">
              <h3>Lien de partage</h3>
              <div class="linkbox">
                <input readonly [value]="m.short_url" />
                <button class="btn btn-sm btn-ghost" (click)="copy(m.short_url!)">Copier</button>
              </div>
              <small class="muted">
                Le lien redirige vers la page publique de remplissage. Clics : {{ m.short_link?.click_count }}
              </small>
            </div>
          }

          @if (isEdit()) {
            <div class="card">
              <h3>Réponses ({{ submissions().length }})</h3>
              @if (submissions().length) {
                @for (s of submissions(); track s.id) {
                  <div class="sub">
                    <div class="tag">{{ s.submitted_at | date: 'dd/MM/yy HH:mm' }}</div>
                    @for (entry of entries(s); track entry[0]) {
                      <div><strong>{{ entry[0] }} :</strong> {{ entry[1] }}</div>
                    }
                  </div>
                }
              } @else {
                <div class="muted">Aucune réponse pour le moment.</div>
              }
            </div>
          }
        </div>
      </div>
    }
  `,
  styles: [
    `
      .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; align-items: start; }
      @media (max-width: 900px) { .grid-2 { grid-template-columns: 1fr; } }
      .field-row {
        display: grid;
        grid-template-columns: 1.4fr 1fr auto auto;
        gap: 0.4rem;
        align-items: center;
        margin-bottom: 0.4rem;
      }
      .field-row .opts { grid-column: 1 / -1; }
      .chk { display: flex; align-items: center; gap: 0.3rem; font-size: 0.8rem; white-space: nowrap; }
      .chk input { width: auto; }
      .linkbox { display: flex; gap: 0.4rem; }
      .linkbox input { font-family: ui-monospace, monospace; font-size: 0.8rem; }
      .sub { border-bottom: 1px solid var(--border); padding: 0.6rem 0; font-size: 0.85rem; }
      .sub:last-child { border-bottom: none; }
    `,
  ],
})
export class FormBuilder {
  private service = inject(FormService);
  private projectSvc = inject(ProjectService);
  private docSvc = inject(DocumentService);
  private toast = inject(ToastService);
  private router = inject(Router);

  @Input() id?: string;

  model = signal<OnlineForm | null>(null);
  projects = signal<Project[]>([]);
  confidentialityLevels = signal<Choice[]>([]);
  submissions = signal<FormSubmission[]>([]);
  saving = signal(false);

  constructor() {
    this.projectSvc.list().subscribe((r) => this.projects.set(r.results));
    this.docSvc.choices().subscribe((c) => this.confidentialityLevels.set(c.confidentiality_levels));

    setTimeout(() => {
      if (this.id) {
        this.service.get(+this.id).subscribe((f) => this.model.set(f));
        this.service.submissions(+this.id).subscribe((s) => this.submissions.set(s));
      } else {
        this.model.set({
          title: '',
          description: '',
          project: null,
          schema: [],
          confidentiality: 'internal',
          is_open: true,
          success_message: 'Merci, votre réponse a bien été enregistrée.',
        });
      }
    });
  }

  isEdit() {
    return !!this.id;
  }

  addField(m: OnlineForm) {
    m.schema.push({ key: '', label: '', type: 'text', required: false });
    this.model.set({ ...m });
  }
  removeField(m: OnlineForm, i: number) {
    m.schema.splice(i, 1);
    this.model.set({ ...m });
  }
  syncKey(f: FormField) {
    f.key = (f.label || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '') || 'champ';
  }
  setOptions(f: FormField, raw: string) {
    f.options = raw.split(',').map((s) => s.trim()).filter(Boolean);
  }

  entries(s: FormSubmission): [string, string][] {
    return Object.entries(s.data).map(([k, v]) => [k, String(v)]);
  }

  copy(url: string) {
    navigator.clipboard?.writeText(url);
    this.toast.success('Lien copié.');
  }

  save() {
    const m = this.model();
    if (!m) return;
    if (!m.title) {
      this.toast.error('Le titre est obligatoire.');
      return;
    }
    m.schema.forEach((f) => this.syncKey(f));
    this.saving.set(true);
    const req = this.isEdit() ? this.service.update(+this.id!, m) : this.service.create(m);
    req.subscribe({
      next: (saved) => {
        this.saving.set(false);
        this.toast.success('Formulaire enregistré.');
        if (!this.isEdit()) {
          this.router.navigate(['/forms', saved.id]);
        } else {
          this.model.set(saved);
        }
      },
      error: () => {
        this.saving.set(false);
        this.toast.error("Erreur lors de l'enregistrement.");
      },
    });
  }
}
