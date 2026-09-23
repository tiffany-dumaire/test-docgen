import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DocumentService } from '../../core/services/document.service';
import { ToastService } from '../../core/services/api.service';
import { Choice, DocumentTemplate } from '../../core/models';

@Component({
  selector: 'app-template-list',
  imports: [FormsModule],
  template: `
    <div class="row between">
      <h1>Modèles de documents</h1>
      <button class="btn btn-primary" (click)="newTemplate()">+ Nouveau modèle</button>
    </div>
    <p class="muted">
      Un modèle définit le type de fichier produit et les variables attendues.
      Les modèles système fournissent les générateurs PDF, Excel et Word.
    </p>

    <div class="grid-cards">
      @for (t of templates(); track t.id) {
        <div class="card">
          <div class="row between">
            <strong>{{ t.name }}</strong>
            <span class="badge badge-type">{{ t.doc_type }}</span>
          </div>
          <p class="muted" style="min-height:2.4em">{{ t.description }}</p>
          <div class="tag">Générateur : {{ t.builder_key }}</div>
          <div class="tag">{{ t.schema.length }} variable(s)</div>
          <div class="row" style="gap:.4rem; margin-top:.6rem">
            <button class="btn btn-sm btn-ghost" (click)="edit(t)">Éditer</button>
            @if (!t.is_system) {
              <button class="btn btn-sm btn-danger" (click)="remove(t)">Suppr.</button>
            } @else {
              <span class="tag">système</span>
            }
          </div>
        </div>
      }
    </div>

    @if (editing(); as t) {
      <div class="modal-backdrop" (click)="cancel()">
        <div class="modal card" (click)="$event.stopPropagation()">
          <h3>{{ t.id ? 'Modifier le modèle' : 'Nouveau modèle' }}</h3>
          <div class="form-grid">
            <div class="field">
              <label>Nom *</label>
              <input [(ngModel)]="t.name" />
            </div>
            <div class="field">
              <label>Identifiant (slug) *</label>
              <input [(ngModel)]="t.slug" [disabled]="!!t.id" placeholder="mon-modele" />
            </div>
          </div>
          <div class="form-grid">
            <div class="field">
              <label>Type de fichier</label>
              <select [(ngModel)]="t.doc_type">
                @for (dt of docTypes(); track dt.value) { <option [value]="dt.value">{{ dt.label }}</option> }
              </select>
            </div>
            <div class="field">
              <label>Générateur (builder_key)</label>
              <select [(ngModel)]="t.builder_key">
                <option value="generic_pdf">generic_pdf</option>
                <option value="project_tracking">project_tracking</option>
                <option value="generic_table">generic_table</option>
                <option value="analysis_report">analysis_report</option>
              </select>
            </div>
          </div>
          <div class="field">
            <label>Description</label>
            <textarea [(ngModel)]="t.description" rows="2"></textarea>
          </div>
          <div class="field">
            <label>Schéma des variables (JSON)</label>
            <textarea class="mono" [(ngModel)]="schemaText" rows="8"></textarea>
            <small>Liste de {{ '{' }}"key","label","type","required"{{ '}' }}. Types : text, textarea, email, number, date, select, sections, milestones, table, list.</small>
            @if (schemaError()) { <small class="err">JSON invalide</small> }
          </div>
          <div class="row" style="gap:.5rem">
            <button class="btn btn-primary" (click)="saveTemplate()">Enregistrer</button>
            <button class="btn btn-ghost" (click)="cancel()">Annuler</button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [
    `
      .mono { font-family: ui-monospace, monospace; font-size: 0.8rem; }
      .err { color: var(--danger); }
      .modal-backdrop {
        position: fixed; inset: 0; background: rgba(15, 23, 42, 0.5);
        display: flex; align-items: center; justify-content: center; padding: 1rem; z-index: 500;
      }
      .modal { width: 640px; max-width: 100%; max-height: 90vh; overflow: auto; }
    `,
  ],
})
export class TemplateList {
  private service = inject(DocumentService);
  private toast = inject(ToastService);

  templates = signal<DocumentTemplate[]>([]);
  docTypes = signal<Choice[]>([]);
  editing = signal<DocumentTemplate | null>(null);
  schemaText = '';
  schemaError = signal(false);

  constructor() {
    this.reload();
    this.service.choices().subscribe((c) => this.docTypes.set(c.document_types));
  }

  reload() {
    this.service.templates().subscribe((r) => this.templates.set(r.results));
  }

  newTemplate() {
    this.schemaText = '[]';
    this.schemaError.set(false);
    this.editing.set({
      name: '',
      slug: '',
      description: '',
      doc_type: 'pdf',
      builder_key: 'generic_pdf',
      schema: [],
      is_active: true,
    });
  }

  edit(t: DocumentTemplate) {
    this.schemaText = JSON.stringify(t.schema, null, 2);
    this.schemaError.set(false);
    this.editing.set({ ...t });
  }

  cancel() {
    this.editing.set(null);
  }

  saveTemplate() {
    const t = this.editing();
    if (!t) return;
    if (!t.name || !t.slug) {
      this.toast.error('Nom et identifiant obligatoires.');
      return;
    }
    try {
      t.schema = JSON.parse(this.schemaText || '[]');
      this.schemaError.set(false);
    } catch {
      this.schemaError.set(true);
      return;
    }
    const req = t.id ? this.service.updateTemplate(t.id, t) : this.service.createTemplate(t);
    req.subscribe({
      next: () => {
        this.toast.success('Modèle enregistré.');
        this.editing.set(null);
        this.reload();
      },
      error: () => this.toast.error("Erreur (l'identifiant est peut-être déjà utilisé)."),
    });
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
