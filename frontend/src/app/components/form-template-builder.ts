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
  templateUrl: './form-template-builder.html',
  styleUrl: './form-template-builder.scss',
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
