import { Component, inject, signal, Input, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { MatTabsModule } from '@angular/material/tabs';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DocumentService } from '../../core/services/document.service';
import { ProjectService } from '../../core/services/project.service';
import { CompanyService } from '../../core/services/company.service';
import { ToastService } from '../../core/services/api.service';
import { PreviewService } from '../../core/services/preview.service';
import { DataGrid } from '../../shared/data-grid';
import {
  Block,
  CellType,
  Choice,
  DocumentTemplate,
  DocumentVersion,
  ExcelSheet,
  ProjectDocument,
  Project,
  TableData,
} from '../../core/models';

@Component({
  selector: 'app-document-editor',
  imports: [FormsModule, RouterLink, DatePipe, DataGrid, MatTabsModule],
  template: `
    <div class="row between">
      <h1>{{ isEdit() ? doc()?.title : 'Nouveau document' }}</h1>
      <a class="btn btn-ghost" routerLink="/documents">Retour</a>
    </div>

    @if (doc(); as d) {
      <mat-tab-group class="detail-tabs" animationDuration="200ms" mat-stretch-tabs="false">
        <mat-tab label="Contenu à remplir">
        <div class="stack tabpad">
          <div class="card stack">
            <h3>Paramètres</h3>
            <div class="field">
              <label>Titre du document *</label>
              <input [(ngModel)]="d.title" />
            </div>
            <div class="form-grid">
              <div class="field">
                <label>Projet *</label>
                <select [(ngModel)]="d.project" [disabled]="isEdit()" (ngModelChange)="onProjectChange($event)">
                  <option [ngValue]="null" disabled>— choisir —</option>
                  @for (p of projects(); track p.id) {
                    <option [ngValue]="p.id">{{ p.name }} ({{ p.client_name }})</option>
                  }
                </select>
              </div>
              <div class="field">
                <label>Modèle *</label>
                <select [(ngModel)]="d.template" [disabled]="isEdit()" (ngModelChange)="onTemplateChange()">
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
            <div class="field">
              <label>Date du document</label>
              <input type="date" [ngModel]="d.doc_date" (ngModelChange)="d.doc_date = $event || null" />
              <small class="muted">Utilisable dans les textes via {{ '{{' }}doc_date{{ '}}' }}.</small>
            </div>
          </div>

          <!-- Saisie assistée depuis les blocs -->
          @if (activeTemplate(); as tpl) {
            @if (isExcelWorkbook(tpl)) {
              <div class="card stack">
                <h3>Données du classeur</h3>
                <div class="sheet-tabs">
                  @for (sh of wbSheets(tpl); track sh.id; let i = $index) {
                    <button class="stab" [class.active]="activeSheet() === i" (click)="activeSheet.set(i)">
                      {{ sheetIcon(sh.type) }} {{ sh.name }}
                    </button>
                  }
                </div>
                @if (wbSheets(tpl)[activeSheet()]; as sh) {
                  @if (sh.type === 'table') {
                    <p class="muted" style="margin:.2rem 0">Saisissez les lignes. Colonnes typées : les formats (monnaie, date…) sont appliqués à la génération.</p>
                    <div class="col-hints">
                      @for (c of sh.columns ?? []; track c.key) {
                        <span class="chip">{{ c.label }} <em>· {{ typeShort(c.type) }}</em></span>
                      }
                    </div>
                    <app-data-grid [model]="sheetGrid(d, sh)" [allowColumns]="!!sh.allow_add_columns" />
                  } @else if (sh.type === 'pivot') {
                    <div class="info-block">⊞ Tableau croisé généré automatiquement à partir de l'onglet
                      « {{ sourceName(tpl, sh) }} » (agrégation : {{ sh.pivot?.agg }}).</div>
                  } @else {
                    <div class="info-block">ℹ️ Informations fixes définies dans le modèle
                      ({{ (sh.items ?? []).length }} élément(s)). Elles seront insérées telles quelles.</div>
                  }
                }
              </div>
            } @else if (tpl.is_block_based) {
              <div class="card stack">
                <h3>Contenu à remplir</h3>
                @for (block of asBlocks(tpl); track block.id) {
                  @switch (block.type) {
                    @case ('heading') {
                      <div class="preview-heading" [style.fontSize.rem]="block.level === 1 ? 1.3 : 1.05">
                        {{ interpolate(block.text || '') }}
                      </div>
                    }
                    @case ('text') {
                      <div class="preview-text">{{ interpolate(block.text || '') }}</div>
                    }
                    @case ('richtext') {
                      <div class="preview-rich" [innerHTML]="block.text"></div>
                    }
                    @case ('bullet_list') {
                      <ul class="preview-list">@for (it of block.items ?? []; track $index) { <li>{{ interpolate(it) }}</li> }</ul>
                    }
                    @case ('numbered_list') {
                      <ol class="preview-list">@for (it of block.items ?? []; track $index) { <li>{{ interpolate(it) }}</li> }</ol>
                    }
                    @case ('image') {
                      @if (block.asset_url) { <img [src]="block.asset_url" class="preview-thumb" [style.width.%]="block.width_pct" /> }
                    }
                    @case ('logo') {
                      <div class="info-block">🏢 Logo de l'entreprise (position : {{ block.align }}).</div>
                    }
                    @case ('code') {
                      <pre class="preview-code">{{ interpolate(block.text || '') }}</pre>
                    }
                    @case ('link') {
                      <div class="preview-text">🔗 {{ block.label || block.url }}</div>
                    }
                    @case ('field') {
                      <div class="field">
                        <label>{{ block.label || 'Champ' }} @if (block.required) { <span class="req">*</span> }</label>
                        @switch (block.field_type) {
                          @case ('textarea') {
                            <textarea [ngModel]="fieldVal(d, block.key!)" (ngModelChange)="setField(d, block.key!, $event)" rows="3"></textarea>
                          }
                          @case ('select') {
                            <select [ngModel]="fieldVal(d, block.key!)" (ngModelChange)="setField(d, block.key!, $event)">
                              <option value="">—</option>
                              @for (opt of block.options ?? []; track opt) { <option [value]="opt">{{ opt }}</option> }
                            </select>
                          }
                          @default {
                            <input
                              [type]="inputType(block.field_type)"
                              [ngModel]="fieldVal(d, block.key!)"
                              (ngModelChange)="setField(d, block.key!, $event)"
                            />
                          }
                        }
                      </div>
                    }
                    @case ('table') {
                      <div class="field">
                        <label>{{ block.label || 'Tableau' }}</label>
                        <app-data-grid
                          [model]="tableModel(d, block)"
                          [allowColumns]="!!block.allow_edit_columns"
                        />
                      </div>
                    }
                    @case ('contacts') {
                      <div class="info-block">
                        📇 Les contacts du projet ({{ scopeLabel(block.scope) }}) seront insérés automatiquement ici.
                      </div>
                    }
                    @case ('spacer') {
                      <div style="height:8px"></div>
                    }
                  }
                }
              </div>
            } @else {
              <!-- Modèle avancé (non visuel) : saisie JSON de repli -->
              <div class="card stack">
                <h3>Variables (modèle avancé)</h3>
                <p class="muted">Ce modèle n'utilise pas l'éditeur visuel. Saisie JSON :</p>
                <textarea class="mono" [ngModel]="jsonData(d)" (ngModelChange)="setJsonData(d, $event)" rows="8"></textarea>
                @if (jsonError()) { <small class="req">JSON invalide</small> }
              </div>
            }
          }

          <div class="row">
            <button class="btn btn-primary" (click)="save()" [disabled]="saving()">
              {{ isEdit() ? 'Enregistrer' : 'Créer le document' }}
            </button>
          </div>
        </div>
        </mat-tab>

        <mat-tab label="Génération & versions">
        <div class="stack tabpad">
          <div class="card stack">
            <h3>Générer une version</h3>
            @if (!isEdit()) {
              <p class="muted">Enregistrez d'abord le document, puis générez sa première version.</p>
            } @else {
              <div class="form-grid">
                <div class="field">
                  <label>Vos initiales *</label>
                  <input [(ngModel)]="gen.author_initials" maxlength="10" placeholder="ex : PM" />
                </div>
                <div class="field">
                  <label>Votre nom</label>
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
              <button class="btn btn-ghost" (click)="preview()" [disabled]="previewing()">
                👁 {{ previewing() ? 'Aperçu…' : 'Aperçu' }}
              </button>
              <small class="muted">Pensez à <b>Enregistrer</b> vos modifications avant de générer.</small>
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
                        <button class="btn btn-sm btn-ghost" (click)="restore(v)" title="Restaurer cette version">↺</button>
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
        </mat-tab>
      </mat-tab-group>
    }
  `,
  styles: [
    `
      .detail-tabs { margin-top: 1rem; }
      .tabpad { padding-top: 1.2rem; }
      .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; align-items: start; }
      @media (max-width: 900px) { .grid-2 { grid-template-columns: 1fr; } }
      .mono { font-family: ui-monospace, monospace; font-size: 0.8rem; }
      .req { color: var(--danger); }
      .cmt { max-width: 220px; }
      .preview-heading { font-weight: 700; color: var(--dark); margin: 0.3rem 0 0; }
      .preview-text { color: var(--muted); font-size: 0.88rem; white-space: pre-wrap; border-left: 3px solid var(--border); padding-left: 0.6rem; }
      .info-block { background: var(--primary-light); color: var(--primary-dark); border-radius: 8px; padding: 0.6rem 0.8rem; font-size: 0.85rem; }
      .sheet-tabs { display: flex; flex-wrap: wrap; gap: 0.3rem; margin-bottom: 0.5rem; }
      .stab { border: 1px solid var(--border); background: #fff; border-radius: 8px; padding: 0.35rem 0.7rem; cursor: pointer; font-size: 0.82rem; font-weight: 600; }
      .stab.active { background: var(--primary); color: #fff; border-color: var(--primary); }
      .col-hints { display: flex; flex-wrap: wrap; gap: 0.3rem; margin-bottom: 0.5rem; }
      .col-hints .chip { background: var(--bg); border: 1px solid var(--border); border-radius: 999px; padding: 0.1rem 0.55rem; font-size: 0.74rem; color: var(--dark); }
      .col-hints .chip em { color: var(--muted); font-style: normal; }
      .preview-rich { font-size: 0.88rem; color: var(--dark); border-left: 3px solid var(--border); padding-left: 0.6rem; }
      .preview-list { margin: 0.2rem 0 0.2rem 1rem; color: var(--muted); font-size: 0.88rem; }
      .preview-thumb { max-width: 100%; border: 1px solid var(--border); border-radius: 6px; }
      .preview-code { background: var(--bg); border-radius: 6px; padding: 0.5rem 0.7rem; font-family: ui-monospace, monospace; font-size: 0.8rem; white-space: pre-wrap; }
    `,
  ],
})
export class DocumentEditor {
  private service = inject(DocumentService);
  private projectSvc = inject(ProjectService);
  private companySvc = inject(CompanyService);
  private toast = inject(ToastService);
  private previewSvc = inject(PreviewService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  @Input() id?: string;

  doc = signal<ProjectDocument | null>(null);
  projects = signal<Project[]>([]);
  templates = signal<DocumentTemplate[]>([]);
  confidentialityLevels = signal<Choice[]>([]);
  selectedProject = signal<Project | null>(null);
  companyName = signal('');
  jsonError = signal(false);
  saving = signal(false);
  generating = signal(false);
  previewing = signal(false);

  gen = { author_initials: '', author_name: '', comment: '' };
  private jsonCache = '';

  activeTemplate = computed(() => {
    const d = this.doc();
    if (!d?.template) return null;
    return this.templates().find((t) => t.id === d.template) ?? null;
  });

  versions = computed(() => this.doc()?.versions ?? []);

  constructor() {
    this.projectSvc.list().subscribe((r) => this.projects.set(r.results));
    this.service.templates({ is_active: true, page_size: 1000 }).subscribe((r) => this.templates.set(r.results));
    this.service.choices().subscribe((c) => this.confidentialityLevels.set(c.confidentiality_levels));
    this.companySvc.get().subscribe((c) => this.companyName.set(c.name));

    setTimeout(() => {
      if (this.id) {
        this.service.get(+this.id).subscribe((d) => {
          this.doc.set(d);
          if (d.project) this.loadProject(d.project);
        });
      } else {
        const preProject = this.route.snapshot.queryParamMap.get('project');
        const pid = preProject ? +preProject : null;
        this.doc.set({
          project: pid as unknown as number,
          template: null as unknown as number,
          title: '',
          confidentiality: 'internal',
          data: {},
        });
        if (pid) this.loadProject(pid);
      }
    });
  }

  isEdit() {
    return !!this.id;
  }

  asBlocks(tpl: DocumentTemplate): Block[] {
    return (tpl.schema as Block[]) ?? [];
  }

  onProjectChange(pid: number) {
    if (pid) this.loadProject(pid);
  }
  private loadProject(pid: number) {
    this.projectSvc.get(pid).subscribe((p) => this.selectedProject.set(p));
  }

  onTemplateChange() {
    // Initialise les données pour le nouveau modèle
    const d = this.doc();
    const tpl = this.activeTemplate();
    if (d && tpl?.is_block_based) {
      this.initBlockData(d, tpl);
      this.doc.set({ ...d });
    }
  }

  private initBlockData(d: ProjectDocument, tpl: DocumentTemplate) {
    for (const block of this.asBlocks(tpl)) {
      if (block.type === 'field' && block.key && !(block.key in d.data)) {
        d.data[block.key] = '';
      }
      if (block.type === 'table' && block.key) {
        const existing = d.data[block.key] as TableData | undefined;
        if (!existing || !Array.isArray(existing.columns)) {
          d.data[block.key] = {
            columns: (block.columns ?? []).map((c) => c.label),
            rows: [],
          };
        }
      }
    }
  }

  // --- Champs ---
  fieldVal(d: ProjectDocument, key: string): string {
    const v = d.data[key];
    return v == null ? '' : String(v);
  }
  setField(d: ProjectDocument, key: string, value: unknown) {
    d.data[key] = value;
  }
  inputType(t?: string): string {
    if (t === 'number') return 'number';
    if (t === 'date') return 'date';
    return 'text';
  }

  // --- Tableaux : renvoie toujours la même référence ---
  activeSheet = signal(0);

  isExcelWorkbook(tpl: DocumentTemplate): boolean {
    return tpl.doc_type === 'xlsx' && !!tpl.settings?.excel?.sheets?.length;
  }
  wbSheets(tpl: DocumentTemplate): ExcelSheet[] {
    return tpl.settings?.excel?.sheets ?? [];
  }
  sheetIcon(t: string) { return t === 'table' ? '▦' : t === 'pivot' ? '⊞' : 'ℹ'; }
  typeShort(t: CellType) {
    return { text: 'texte', integer: 'entier', decimal: 'décimal',
      currency: 'monnaie', percent: '%', date: 'date' }[t] ?? t;
  }
  sourceName(tpl: DocumentTemplate, sh: ExcelSheet): string {
    const src = this.wbSheets(tpl).find((x) => x.id === sh.pivot?.source);
    return src?.name ?? '—';
  }
  sheetGrid(d: ProjectDocument, sh: ExcelSheet): TableData {
    const data = d.data as Record<string, unknown>;
    const store = (data['sheets'] ??= {}) as Record<string, TableData>;
    const labels = (sh.columns ?? []).map((c) => c.label);
    let sd = store[sh.id];
    if (!sd || !Array.isArray(sd.columns) || !sd.columns.length) {
      sd = { columns: labels, rows: sd?.rows ?? [] };
      store[sh.id] = sd;
    }
    return sd;
  }

  tableModel(d: ProjectDocument, block: Block): TableData {
    const key = block.key!;
    let td = d.data[key] as TableData | undefined;
    if (!td || !Array.isArray(td.columns)) {
      td = { columns: (block.columns ?? []).map((c) => c.label), rows: [] };
      d.data[key] = td;
    }
    return td;
  }

  // --- Interpolation d'aperçu ---
  interpolate(text: string): string {
    const ctx = this.previewContext();
    return text.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (m, k) =>
      k in ctx ? String(ctx[k]) : m,
    );
  }
  private previewContext(): Record<string, unknown> {
    const d = this.doc();
    const p = this.selectedProject();
    const ctx: Record<string, unknown> = {
      project_name: p?.name ?? '',
      client_name: p?.client_name ?? '',
      project_reference: p?.reference ?? '',
      project_description: p?.description ?? '',
      company_name: this.companyName(),
      document_title: d?.title ?? '',
      today: new Date().toLocaleDateString('fr-FR'),
      version: `v${d?.current_version ?? 0}`,
    };
    for (const [k, v] of Object.entries(d?.data ?? {})) {
      if (typeof v === 'string' || typeof v === 'number') ctx[k] = v;
    }
    return ctx;
  }

  scopeLabel(scope?: string): string {
    if (scope === 'client') return 'client';
    if (scope === 'internal') return 'interne';
    return 'client + interne';
  }

  // --- Repli JSON (modèles avancés) ---
  jsonData(d: ProjectDocument): string {
    if (this.jsonCache) return this.jsonCache;
    return JSON.stringify(d.data ?? {}, null, 2);
  }
  setJsonData(d: ProjectDocument, raw: string) {
    this.jsonCache = raw;
    try {
      d.data = JSON.parse(raw || '{}');
      this.jsonError.set(false);
    } catch {
      this.jsonError.set(true);
    }
  }

  preview() {
    const d = this.doc();
    if (!d?.id) { this.toast.error('Enregistrez d\'abord le document.'); return; }
    this.previewing.set(true);
    this.service.update(d.id, d).subscribe({
      next: () => {
        this.service.preview(d.id!).subscribe({
          next: (r) => { this.previewing.set(false); this.previewSvc.open(r, d.title || 'Aperçu'); },
          error: () => { this.previewing.set(false); this.toast.error('Aperçu impossible.'); },
        });
      },
      error: () => { this.previewing.set(false); this.toast.error('Aperçu impossible.'); },
    });
  }

  save() {
    const d = this.doc();
    if (!d) return;
    if (!d.title || !d.project || !d.template) {
      this.toast.error('Titre, projet et modèle sont obligatoires.');
      return;
    }
    if (this.jsonError()) {
      this.toast.error('Corrigez le JSON avant d\'enregistrer.');
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
      this.toast.error('Vos initiales sont obligatoires.');
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

  restore(v: DocumentVersion) {
    const d = this.doc();
    if (!d?.id || !v.id) return;
    if (!confirm(`Restaurer la version v${v.version_number} ? Une nouvelle version en sera créée.`)) return;
    const initials = this.gen.author_initials.trim() || '—';
    this.service.restoreVersion(d.id, v.id, initials).subscribe({
      next: () => {
        this.toast.success(`Version v${v.version_number} restaurée.`);
        this.service.get(d.id!).subscribe((fresh) => this.doc.set(fresh));
      },
      error: () => this.toast.error('Restauration impossible.'),
    });
  }
}
