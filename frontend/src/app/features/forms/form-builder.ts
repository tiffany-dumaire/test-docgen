import { Component, inject, signal, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { BackDirective } from '../../shared/back.directive';
import { FormService } from '../../core/services/form.service';
import { ProjectService } from '../../core/services/project.service';
import { DocumentService } from '../../core/services/document.service';
import { ToastService } from '../../core/services/api.service';
import { FormSchemaEditor } from './form-schema-editor';
import { FormAppearanceEditor } from './form-appearance-editor';
import { FormPreview } from './form-preview';
import { CompanyService } from '../../core/services/company.service';
import { Choice, FormField, FormSection, FormSubmission, OnlineForm, Project } from '../../core/models';

@Component({
  selector: 'app-form-builder',
  imports: [BackDirective, FormsModule, DatePipe, FormSchemaEditor, FormAppearanceEditor, FormPreview],
  template: `
    <div class="row between">
      <h1>{{ isEdit() ? 'Gérer le formulaire' : 'Nouveau formulaire' }}</h1>
      <div class="row" style="gap:.5rem">
        <button class="btn btn-ghost" (click)="showPreview.set(true)" [disabled]="!model()">👁 Aperçu</button>
        <button type="button" class="btn btn-ghost" appBack="/forms">Retour</button>
      </div>
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
            <div class="field">
              <label>Date limite de réponse</label>
              <input type="date" [ngModel]="m.deadline" (ngModelChange)="m.deadline = $event || null" />
            </div>
            <label class="chk"><input type="checkbox" [(ngModel)]="m.is_open" /> Ouvert aux réponses</label>
          </div>

          <app-form-appearance-editor [theme]="theme(m)" [(showProgress)]="m.show_progress!" (changed)="touch()" />

          <app-form-schema-editor [sections]="sections(m)" (changed)="touch()" />

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
              <small class="muted">Le lien ouvre la page publique de remplissage. Clics : {{ m.short_link?.click_count }}</small>
            </div>
          }

          @if (isEdit() && m.report_template) {
            <div class="card">
              <div class="row between">
                <h3>Rapport statistiques</h3>
                <button class="btn btn-sm btn-primary" (click)="genReport()" [disabled]="reporting()">Générer le rapport</button>
              </div>
              <p class="muted" style="margin:.2rem 0 0">Génère le document Word/PDF lié, avec les diagrammes du formulaire insérés comme variables.</p>
            </div>
          }

          @if (isEdit() && (m.diagrams?.length || 0) > 0) {
            <div class="card">
              <div class="row between">
                <h3>Diagrammes ({{ m.diagrams!.length }})</h3>
                <button class="btn btn-sm btn-ghost" (click)="loadDiagrams()">↻ Actualiser</button>
              </div>
              <p class="muted" style="margin:.2rem 0 .6rem">Calculés à partir des {{ subCount() }} réponse(s).</p>
              @for (dg of m.diagrams!; track dg.id) {
                <div class="diag-card">
                  @if (imgUrl(dg.id)) { <img [src]="imgUrl(dg.id)" [alt]="dg.title" /> }
                  @else { <div class="diag-empty">Aucune donnée pour « {{ dg.title }} ».</div> }
                  <div class="row" style="gap:.4rem; margin-top:.3rem">
                    <button class="btn btn-sm btn-ghost" (click)="download(dg.id, 'png', dg.title)">⬇ PNG</button>
                    <button class="btn btn-sm btn-ghost" (click)="download(dg.id, 'svg', dg.title)">⬇ SVG</button>
                  </div>
                </div>
              }
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
              } @else { <div class="muted">Aucune réponse pour le moment.</div> }
            </div>
          }
        </div>
      </div>

      @if (showPreview()) {
        <div class="pv-overlay" (click)="showPreview.set(false)">
          <div class="pv-panel" (click)="$event.stopPropagation()">
            <div class="pv-bar">
              <span>Aperçu du formulaire</span>
              <button class="btn btn-sm btn-ghost" (click)="showPreview.set(false)">✕ Fermer</button>
            </div>
            <app-form-preview [title]="m.title" [description]="m.description"
              [sections]="sections(m)" [theme]="theme(m)" [showProgress]="m.show_progress !== false"
              [logoUrl]="logoUrl()" [companyName]="companyName()" />
          </div>
        </div>
      }
    }
  `,
  styles: [`
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; align-items: start; }
    .pv-overlay { position: fixed; inset: 0; background: rgba(15,23,42,.5); z-index: 1000; display: flex; justify-content: center; align-items: flex-start; padding: 2rem 1rem; overflow: auto; }
    .pv-panel { width: 700px; max-width: 100%; }
    .pv-bar { display: flex; justify-content: space-between; align-items: center; color: #fff; margin-bottom: .5rem; font-weight: 600; }
    @media (max-width: 900px) { .grid-2 { grid-template-columns: 1fr; } }
    .chk { display: flex; align-items: center; gap: 0.3rem; font-weight: 600; }
    .chk input { width: auto; }
    .linkbox { display: flex; gap: 0.4rem; }
    .linkbox input { font-family: ui-monospace, monospace; font-size: 0.8rem; }
    .sub { border-bottom: 1px solid var(--border); padding: 0.6rem 0; font-size: 0.85rem; }
    .sub:last-child { border-bottom: none; }
    .diag-card { border: 1px solid var(--border); border-radius: 10px; padding: .5rem; margin-bottom: .7rem; background: #fff; }
    .diag-card img { width: 100%; border-radius: 6px; }
    .diag-empty { padding: 1.2rem .6rem; color: var(--muted); font-size: .82rem; text-align: center; }
    .tag { display: inline-block; font-size: .7rem; font-weight: 700; color: var(--muted); }
  `],
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
    this.companySvc.get().subscribe((c) => { this.logoUrl.set(c.logo_url || null); this.companyName.set(c.name || null); });
    setTimeout(() => {
      if (this.id) {
        this.service.get(+this.id).subscribe((f) => { this.model.set(this.normalize(f)); this.loadDiagrams(); });
        this.service.submissions(+this.id).subscribe((s) => this.submissions.set(s));
      } else {
        this.model.set(this.normalize({
          title: '', description: '', project: null, schema: [], diagrams: [],
          confidentiality: 'internal', is_open: true, show_progress: true,
          success_message: 'Merci, votre réponse a bien été enregistrée.',
        } as OnlineForm));
      }
    });
  }

  isEdit() { return !!this.id; }

  private normalize(f: OnlineForm): OnlineForm {
    f.schema = FormSchemaEditor.toSections((f.schema || []) as any[]);
    if (!f.theme) f.theme = { layout: 'card', accent: '#ec6608', background: '#f4f5f7' };
    if (f.show_progress === undefined) f.show_progress = true;
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
