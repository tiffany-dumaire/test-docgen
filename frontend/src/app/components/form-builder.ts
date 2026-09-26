import { Component, inject, signal, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { BackDirective } from '@shared/back.directive';
import { FormService } from '@core/services/form.service';
import { ProjectService } from '@core/services/project.service';
import { DocumentService } from '@core/services/document.service';
import { ToastService } from '@core/services/api.service';
import { FormSchemaEditor } from '@shared/fields/form-schema-editor';
import { FormAppearanceEditor } from '@shared/fields/form-appearance-editor';
import { FormPreview } from '@shared/fields/form-preview';
import { CompanyService } from '@core/services/company.service';
import { Choice, Confidentiality, FormField, FormSection, FormSubmission, OnlineForm, Project } from '@core/models';

@Component({
  selector: 'app-form-builder',
  imports: [BackDirective, FormsModule, DatePipe, FormSchemaEditor, FormAppearanceEditor, FormPreview],
  templateUrl: './form-builder.html',
  styleUrl: './form-builder.scss',
})
export class FormBuilder {
  private service = inject(FormService);
  private projectSvc = inject(ProjectService);
  private docSvc = inject(DocumentService);
  private companySvc = inject(CompanyService);
  private toast = inject(ToastService);
  private router = inject(Router);

  @Input() id?: string;

  model = signal<OnlineForm | null>(null);
  projects = signal<Project[]>([]);
  confidentialityLevels = signal<Choice[]>([]);
  submissions = signal<FormSubmission[]>([]);
  saving = signal(false);
  reporting = signal(false);
  subCount = signal(0);
  showPreview = signal(false);
  logoUrl = signal<string | null>(null);
  companyName = signal<string | null>(null);
  private diagramUrls = signal<Record<string, string>>({});

  imgUrl(id: string): string | null { return this.diagramUrls()[id] ?? null; }
  touch() { const m = this.model(); if (m) this.model.set({ ...m }); }

  constructor() {
    this.projectSvc.list().subscribe((r) => this.projects.set(r.results));
    this.docSvc.choices().subscribe((c) => this.confidentialityLevels.set(c.confidentiality_levels));
    this.companySvc.get().subscribe((c) => { this.logoUrl.set(c.logoUrl || null); this.companyName.set(c.name || null); });
    setTimeout(() => {
      if (this.id) {
        this.service.get(+this.id).subscribe((f) => { this.model.set(this.normalize(f)); this.loadDiagrams(); });
        this.service.submissions(+this.id).subscribe((s) => this.submissions.set(s));
      } else {
        this.model.set(this.normalize({
          title: '', description: '', project: null, schema: [], diagrams: [],
          confidentiality: Confidentiality.Internal, isOpen: true, showProgress: true,
          successMessage: 'Merci, votre réponse a bien été enregistrée.',
        } as OnlineForm));
      }
    });
  }

  isEdit() { return !!this.id; }

  private normalize(f: OnlineForm): OnlineForm {
    f.schema = FormSchemaEditor.toSections((f.schema || []) as any[]);
    if (!f.theme) f.theme = { layout: 'card', accent: '#ec6608', background: '#f4f5f7' };
    if (f.showProgress === undefined) f.showProgress = true;
    return f;
  }
  sections(m: OnlineForm): FormSection[] { return m.schema as FormSection[]; }
  theme(m: OnlineForm) { return m.theme || (m.theme = {}); }

  entries(s: FormSubmission): [string, string][] {
    return Object.entries(s.data).map(([k, v]) => {
      if (Array.isArray(v)) return [k, v.join(', ')] as [string, string];
      if (v && typeof v === 'object') return [k, (v as any).name || JSON.stringify(v)] as [string, string];
      return [k, String(v)] as [string, string];
    });
  }

  loadDiagrams() {
    const m = this.model();
    if (!this.id || !m?.diagrams?.length) return;
    this.service.diagramsData(+this.id).subscribe((res) => {
      this.subCount.set(res.count);
      Object.values(this.diagramUrls()).forEach((u) => URL.revokeObjectURL(u));
      this.diagramUrls.set({});
      for (const item of res.diagrams) {
        const cfg = item.config;
        const hasData = (item.series?.values?.length ?? 0) > 0 && item.series.values.some((v) => v !== 0);
        if (!hasData) continue;
        this.service.diagramBlob(+this.id!, cfg.id, 'png').subscribe((blob) => {
          const url = URL.createObjectURL(blob);
          this.diagramUrls.update((cur) => ({ ...cur, [cfg.id]: url }));
        });
      }
    });
  }

  download(diagramId: string, format: 'png' | 'svg', title: string) {
    if (!this.id) return;
    this.service.diagramBlob(+this.id, diagramId, format).subscribe((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const safe = (title || 'diagramme').toLowerCase().replace(/[^a-z0-9]+/g, '-');
      a.href = url; a.download = `${safe}.${format}`; a.click();
      URL.revokeObjectURL(url);
    });
  }

  genReport() {
    if (!this.id) return;
    this.reporting.set(true);
    this.service.generateReport(+this.id).subscribe({
      next: (r) => { this.reporting.set(false); this.toast.success('Rapport généré.'); this.router.navigate(['/documents', r.document.id]); },
      error: (e) => { this.reporting.set(false); this.toast.error(e?.error?.detail || 'Génération impossible.'); },
    });
  }
  copy(url: string) { navigator.clipboard?.writeText(url); this.toast.success('Lien copié.'); }

  save() {
    const m = this.model();
    if (!m) return;
    if (!m.title) { this.toast.error('Le titre est obligatoire.'); return; }
    for (const q of FormSchemaEditor.questions(this.sections(m))) this.syncKey(q);
    this.saving.set(true);
    const req = this.isEdit() ? this.service.update(+this.id!, m) : this.service.create(m);
    req.subscribe({
      next: (saved) => {
        this.saving.set(false);
        this.toast.success('Formulaire enregistré.');
        if (!this.isEdit()) this.router.navigate(['/forms', saved.id]);
        else this.model.set(this.normalize(saved));
      },
      error: () => { this.saving.set(false); this.toast.error("Erreur lors de l'enregistrement."); },
    });
  }

  private syncKey(f: FormField) {
    f.key = (f.label || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'champ';
  }
}
