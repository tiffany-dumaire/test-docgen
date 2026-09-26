import { Component, inject, signal, Input, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { BackDirective } from '@shared/back.directive';
import { MatTabsModule } from '@angular/material/tabs';
import { FormService } from '@core/services/form.service';
import { ProjectService } from '@core/services/project.service';
import { DocumentService } from '@core/services/document.service';
import { ToastService } from '@core/services/api.service';
import { FormSchemaEditor } from '@shared/fields/form-schema-editor';
import { FormAppearanceEditor } from '@shared/fields/form-appearance-editor';
import { FormPreview } from '@shared/fields/form-preview';
import { CompanyService } from '@core/services/company.service';
import {
  Choice,
  Confidentiality,
  FormDiagram,
  FormField,
  FormSection,
  FormTemplate,
  LANGUAGES,
  Project,
} from '@core/models';

const VARIANTS: { value: string; label: string }[] = [
  { value: 'bar', label: 'Barres verticales' },
  { value: 'hbar', label: 'Barres horizontales' },
  { value: 'pie', label: 'Camembert' },
  { value: 'donut', label: 'Anneau' },
  { value: 'line', label: 'Courbe' },
];

@Component({
  selector: 'app-form-template-builder',
  imports: [BackDirective, FormsModule, MatTabsModule, FormSchemaEditor, FormAppearanceEditor, FormPreview],
  template: `
    <div class="row between">
      <h1>{{ isEdit() ? 'Modifier le modèle de formulaire' : 'Nouveau modèle de formulaire' }}</h1>
      <div class="row" style="gap:.5rem">
        <button class="btn btn-ghost" (click)="showPreview.set(true)" [disabled]="!model()">👁 Aperçu</button>
        <button type="button" class="btn btn-ghost" appBack="/templates">Retour aux modèles</button>
      </div>
    </div>
    <p class="muted">
      Un modèle de formulaire regroupe des questions réutilisables et des diagrammes
      calculés à partir des réponses (exportables en PNG / SVG). Les formulaires en
      ligne peuvent ensuite être générés depuis un projet.
    </p>

    @if (model(); as m) {
      <mat-tab-group class="detail-tabs" animationDuration="200ms" mat-stretch-tabs="false">
        <!-- ============ GÉNÉRAL ============ -->
        <mat-tab label="Général">
          <div class="tabpad">
            <div class="card stack">
              <div class="field">
                <label>Nom du modèle *</label>
                <input [(ngModel)]="m.name" />
              </div>
              <div class="field">
                <label>Description</label>
                <textarea [(ngModel)]="m.description" rows="2"></textarea>
              </div>
              <div class="form-grid">
                <div class="field">
                  <label>Confidentialité par défaut</label>
                  <select [(ngModel)]="m.confidentiality">
                    @for (c of confidentialityLevels(); track c.value) { <option [value]="c.value">{{ c.label }}</option> }
                  </select>
                </div>
                <div class="field">
                  <label>Portée</label>
                  <select [(ngModel)]="m.scope">
                    <option value="global">Ouvert à tous les projets</option>
                    <option value="projects">Spécifique à certains projets</option>
                  </select>
                </div>
              </div>
              <div class="field">
                <label>Message de confirmation</label>
                <input [(ngModel)]="m.successMessage" />
              </div>
              <div class="field">
                <label>Langue</label>
                <select [(ngModel)]="m.language">
                  @for (l of languages; track l.value) { <option [value]="l.value">{{ l.flag }} {{ l.label }}</option> }
                </select>
              </div>
              <div class="field">
                <label>Modèle de rapport (Word / PDF)</label>
                <select [(ngModel)]="m.reportTemplate">
                  <option [ngValue]="null">— aucun —</option>
                  @for (t of reportTemplates(); track t.id) { <option [ngValue]="t.id">{{ t.name }} ({{ t.doc_type }})</option> }
                </select>
                <small class="muted">Document dans lequel les diagrammes du formulaire s'insèrent (bloc « Diagramme de formulaire », identifiants d1, d2…).</small>
              </div>
              @if (m.scope === 'projects') {
                <div class="field">
                  <label>Projets autorisés</label>
                  <div class="proj-pick">
                    @for (pr of projects(); track pr.id) {
                      <label class="chip-check">
                        <input type="checkbox" [checked]="isProjSel(m, pr.id!)" (change)="toggleProj(m, pr.id!)" />
                        {{ pr.name }}
                      </label>
                    }
                  </div>
                </div>
              }
            </div>
          </div>
        </mat-tab>

        <!-- ============ QUESTIONS & APPARENCE ============ -->
        <mat-tab label="Questions ({{ qCount(m) }})">
          <div class="tabpad">
            <app-form-appearance-editor [theme]="theme(m)" [(showProgress)]="m.showProgress!" (changed)="touch()" />
            <app-form-schema-editor [sections]="sections(m)" (changed)="touch()" />
          </div>
        </mat-tab>

        <!-- ============ DIAGRAMMES ============ -->
        <mat-tab label="Diagrammes ({{ m.diagrams.length }})">
          <div class="tabpad">
            <div class="card stack">
              <div class="row between">
                <h3>Diagrammes à générer</h3>
                <button class="btn btn-sm btn-primary" (click)="addDiagram(m)" [disabled]="!qCount(m)">+ Diagramme</button>
              </div>
              <p class="muted" style="margin:0">
                Chaque diagramme est calculé à partir des réponses collectées et exportable
                en PNG / SVG. Choisissez une question à analyser et le type de graphique.
              </p>
              @if (!qCount(m)) {
                <div class="empty">Ajoutez d'abord des questions pour configurer des diagrammes.</div>
              }
              @for (dg of m.diagrams; track dg.id; let i = $index) {
                <div class="diag card">
                  <div class="row between">
                    <div class="dg-head">
                      <span class="dg-shape">{{ shapeIcon(dg.variant) }}</span>
                      <input class="dg-title" [(ngModel)]="dg.title" placeholder="Titre du diagramme" />
                    </div>
                    <button class="mini del" (click)="removeDiagram(m, i)">✕</button>
                  </div>
                  <div class="form-grid">
                    <div class="field">
                      <label>Type de graphique</label>
                      <select [(ngModel)]="dg.variant">
                        @for (v of variants; track v.value) { <option [value]="v.value">{{ v.label }}</option> }
                      </select>
                    </div>
                    <div class="field">
                      <label>Analyse</label>
                      <select [(ngModel)]="dg.mode">
                        <option value="distribution">Répartition des réponses (par question)</option>
                        <option value="crosstab">Croisement (regrouper + agréger)</option>
                      </select>
                    </div>
                  </div>

                  @if (dg.mode === 'distribution') {
                    <div class="field">
                      <label>Question analysée</label>
                      <select [(ngModel)]="dg.question">
                        <option [ngValue]="undefined" disabled>— choisir —</option>
                        @for (f of questions(m); track f.key) { <option [value]="f.key">{{ f.label || f.key }}</option> }
                      </select>
                      <small class="muted">Compte le nombre de réponses par valeur (idéal pour listes et cases à cocher).</small>
                    </div>
                  } @else {
                    <div class="form-grid">
                      <div class="field">
                        <label>Regrouper par (question)</label>
                        <select [(ngModel)]="dg.group_by">
                          <option [ngValue]="undefined" disabled>— choisir —</option>
                          @for (f of questions(m); track f.key) { <option [value]="f.key">{{ f.label || f.key }}</option> }
                        </select>
                      </div>
                      <div class="field">
                        <label>Agrégation</label>
                        <select [(ngModel)]="dg.agg">
                          <option value="count">Nombre de réponses</option>
                          <option value="sum">Somme</option>
                          <option value="avg">Moyenne</option>
                        </select>
                      </div>
                    </div>
                    @if (dg.agg !== 'count') {
                      <div class="field">
                        <label>Valeur agrégée (question numérique)</label>
                        <select [(ngModel)]="dg.value">
                          <option [ngValue]="undefined" disabled>— choisir —</option>
                          @for (f of numericFields(m); track f.key) { <option [value]="f.key">{{ f.label || f.key }}</option> }
                        </select>
                      </div>
                    }
                  }

                  <div class="field" style="max-width:220px">
                    <label>Couleur principale</label>
                    <input type="color" [ngModel]="dg.color || '#1F497D'" (ngModelChange)="dg.color = $event" style="width:52px; height:34px; padding:2px" />
                  </div>
                </div>
              }
            </div>
          </div>
        </mat-tab>
      </mat-tab-group>

      <div class="row" style="margin-top:1rem">
        <button class="btn btn-primary" (click)="save()" [disabled]="saving()">
          {{ isEdit() ? 'Enregistrer le modèle' : 'Créer le modèle' }}
        </button>
        @if (isEdit()) {
          <button class="btn btn-ghost" (click)="remove()">Supprimer</button>
        }
      </div>

      @if (showPreview()) {
        <div class="pv-overlay" (click)="showPreview.set(false)">
          <div class="pv-panel" (click)="$event.stopPropagation()">
            <div class="pv-bar">
              <span>Aperçu du modèle</span>
              <button class="btn btn-sm btn-ghost" (click)="showPreview.set(false)">✕ Fermer</button>
            </div>
            <app-form-preview [title]="m.name" [description]="m.description"
              [sections]="sections(m)" [theme]="theme(m)" [showProgress]="m.showProgress !== false"
              [logoUrl]="logoUrl()" [companyName]="companyName()" />
          </div>
        </div>
      }
    }
  `,
  styles: [`
    .detail-tabs { margin-top: .5rem; }
    .tabpad { padding-top: 1.2rem; display:flex; flex-direction:column; gap:1rem; }
    .proj-pick { display:flex; flex-wrap:wrap; gap:.5rem; }
    .chip-check { display:flex; align-items:center; gap:.35rem; border:1px solid var(--border); border-radius:999px; padding:.2rem .6rem; font-size:.82rem; }
    .chip-check input { width:auto; }
    .field-row { display:grid; grid-template-columns:1.4fr 1fr auto auto; gap:.4rem; align-items:center; margin-bottom:.4rem; }
    .field-row .opts { grid-column:1 / -1; }
    .chk { display:flex; align-items:center; gap:.3rem; font-size:.8rem; white-space:nowrap; }
    .chk input { width:auto; }
    .diag { border:1px solid var(--border); background:var(--bg); }
    .dg-head { display:flex; align-items:center; gap:.5rem; flex:1; }
    .dg-shape { font-size:1.3rem; }
    .dg-title { font-weight:600; }
    .mini { border:1px solid var(--border); background:#fff; border-radius:6px; cursor:pointer; padding:.1rem .45rem; font-size:.8rem; color:var(--muted); }
    .mini.del:hover { background:#fee2e2; color:var(--danger); }
    .pv-overlay { position:fixed; inset:0; background:rgba(15,23,42,.5); z-index:1000; display:flex; justify-content:center; align-items:flex-start; padding:2rem 1rem; overflow:auto; }
    .pv-panel { width:700px; max-width:100%; }
    .pv-bar { display:flex; justify-content:space-between; align-items:center; color:#fff; margin-bottom:.5rem; font-weight:600; }
  `],
})
export class FormTemplateBuilder {
  private service = inject(FormService);
  private projectSvc = inject(ProjectService);
  private docSvc = inject(DocumentService);
  private companySvc = inject(CompanyService);
  private toast = inject(ToastService);
  private router = inject(Router);

  @Input() id?: string;

  model = signal<FormTemplate | null>(null);
  projects = signal<Project[]>([]);
  confidentialityLevels = signal<Choice[]>([]);
  reportTemplates = signal<{ id?: number; name: string; doc_type: string }[]>([]);
  languages = LANGUAGES;
  saving = signal(false);
  variants = VARIANTS;
  showPreview = signal(false);
  logoUrl = signal<string | null>(null);
  companyName = signal<string | null>(null);

  constructor() {
    this.projectSvc.list().subscribe((r) => this.projects.set(r.results));
    this.docSvc.choices().subscribe((c) => this.confidentialityLevels.set(c.confidentiality_levels));
    this.companySvc.get().subscribe((c) => { this.logoUrl.set(c.logoUrl || null); this.companyName.set(c.name || null); });
    this.docSvc.templates({ page_size: 1000 }).subscribe((r) => this.reportTemplates.set(
      r.results.filter((t) => t.doc_type === 'docx' || t.doc_type === 'pdf')
        .map((t) => ({ id: t.id, name: t.name, doc_type: t.doc_type }))));
    setTimeout(() => {
      if (this.id) {
        this.service.template(+this.id).subscribe((t) => {
          t.diagrams = t.diagrams ?? [];
          this.model.set(this.normalize(t));
        });
      } else {
        this.model.set(this.normalize({
          name: '', description: '', schema: [], diagrams: [],
          language: 'fr',
          confidentiality: Confidentiality.Internal, successMessage: 'Merci, votre réponse a bien été enregistrée.',
          isActive: true, scope: 'global', projects: [],
        } as FormTemplate));
      }
    });
  }

  isEdit() { return !!this.id; }
  touch() { const m = this.model(); if (m) this.model.set({ ...m }); }

  private normalize(t: FormTemplate): FormTemplate {
    t.schema = FormSchemaEditor.toSections((t.schema || []) as any[]);
    if (!t.theme) t.theme = { layout: 'card', accent: '#ec6608', background: '#f4f5f7' };
    if (t.showProgress === undefined) t.showProgress = true;
    return t;
  }
  sections(m: FormTemplate): FormSection[] { return m.schema as FormSection[]; }
  theme(m: FormTemplate) { return m.theme || (m.theme = {}); }
  questions(m: FormTemplate): FormField[] { return FormSchemaEditor.questions(this.sections(m)); }
  qCount(m: FormTemplate) { return this.questions(m).length; }
  numericFields = (m: FormTemplate) => this.questions(m).filter((f) => f.type === 'number');

  isProjSel(m: FormTemplate, id: number) { return (m.projects ?? []).includes(id); }
  toggleProj(m: FormTemplate, id: number) {
    m.projects = m.projects ?? [];
    const i = m.projects.indexOf(id);
    if (i >= 0) m.projects.splice(i, 1); else m.projects.push(id);
  }

  syncKey(f: FormField) {
    f.key = (f.label || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'champ';
  }

  addDiagram(m: FormTemplate) {
    const first = this.questions(m)[0]?.key;
    m.diagrams.push({
      id: `dg${Date.now()}`, title: 'Nouveau diagramme', variant: 'bar',
      mode: 'distribution', question: first, agg: 'count', color: '#1F497D',
    });
    this.model.set({ ...m });
  }
  removeDiagram(m: FormTemplate, i: number) { m.diagrams.splice(i, 1); this.model.set({ ...m }); }

  shapeIcon(variant: string): string {
    return { bar: '📊', hbar: '📶', pie: '🥧', donut: '🍩', line: '📈' }[variant] ?? '📊';
  }

  save() {
    const m = this.model(); if (!m) return;
    if (!m.name) { this.toast.error('Le nom est obligatoire.'); return; }
    this.questions(m).forEach((f) => this.syncKey(f));
    this.saving.set(true);
    const req = this.isEdit() ? this.service.updateTemplate(+this.id!, m) : this.service.createTemplate(m);
    req.subscribe({
      next: (saved) => {
        this.saving.set(false);
        this.toast.success('Modèle de formulaire enregistré.');
        if (!this.isEdit()) this.router.navigate(['/form-templates', saved.id]);
        else this.model.set(this.normalize({ ...saved, diagrams: saved.diagrams ?? [] }));
      },
      error: () => { this.saving.set(false); this.toast.error("Erreur lors de l'enregistrement."); },
    });
  }

  remove() {
    const m = this.model(); if (!m?.id) return;
    if (!confirm(`Supprimer le modèle « ${m.name} » ?`)) return;
    this.service.removeTemplate(m.id).subscribe({
      next: () => { this.toast.success('Modèle supprimé.'); this.router.navigate(['/templates']); },
      error: () => this.toast.error('Suppression impossible (modèle utilisé ?).'),
    });
  }
}
