import { Component, inject, signal, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormService } from '../../core/services/form.service';
import { ProjectService } from '../../core/services/project.service';
import { DocumentService } from '../../core/services/document.service';
import { ToastService } from '../../core/services/api.service';
import {
  Choice,
  FormContent,
  FormField,
  FormSection,
  FormSubmission,
  OnlineForm,
  Project,
  QuestionType,
} from '../../core/models';

const QUESTION_TYPES: { value: QuestionType; label: string }[] = [
  { value: 'text', label: 'Texte court' },
  { value: 'textarea', label: 'Texte long' },
  { value: 'email', label: 'Email' },
  { value: 'number', label: 'Nombre' },
  { value: 'date', label: 'Date' },
  { value: 'time', label: 'Heure' },
  { value: 'slot', label: 'Créneau' },
  { value: 'select', label: 'Liste déroulante' },
  { value: 'radio', label: 'Choix multiple (une réponse)' },
  { value: 'checkbox', label: 'Case à cocher (oui/non)' },
  { value: 'checkboxes', label: 'Cases à cocher (plusieurs)' },
  { value: 'scale', label: 'Échelle linéaire' },
  { value: 'rating', label: 'Avis (étoiles)' },
  { value: 'file', label: 'Fichier à téléverser' },
];

let uid = 0;
const newId = (p: string) => `${p}${Date.now().toString(36)}${uid++}`;

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
          <!-- Paramètres -->
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
            <div class="row" style="gap:1.2rem;flex-wrap:wrap">
              <label class="chk"><input type="checkbox" [(ngModel)]="m.is_open" /> Ouvert aux réponses</label>
              <label class="chk"><input type="checkbox" [(ngModel)]="m.show_progress" /> Afficher la progression</label>
            </div>
          </div>

          <!-- Apparence -->
          <div class="card stack">
            <h3>🎨 Apparence du formulaire</h3>
            <div class="form-grid">
              <div class="field">
                <label>Disposition</label>
                <select [ngModel]="theme(m).layout || 'card'" (ngModelChange)="setTheme(m, 'layout', $event)">
                  <option value="card">Carte centrée</option>
                  <option value="cover">Bannière de couverture</option>
                  <option value="plain">Épuré</option>
                </select>
              </div>
              <div class="field">
                <label>Libellé du bouton d'envoi</label>
                <input [ngModel]="theme(m).button_label || ''" (ngModelChange)="setTheme(m, 'button_label', $event)" placeholder="Envoyer" />
              </div>
              <div class="field">
                <label>Couleur d'accent</label>
                <input type="color" [ngModel]="theme(m).accent || '#ec6608'" (ngModelChange)="setTheme(m, 'accent', $event)" />
              </div>
              <div class="field">
                <label>Couleur de fond</label>
                <input type="color" [ngModel]="theme(m).background || '#f4f5f7'" (ngModelChange)="setTheme(m, 'background', $event)" />
              </div>
            </div>
            <div class="field">
              <label>Image de couverture (bannière)</label>
              <div class="upload-row">
                @if (theme(m).cover_image) { <img class="thumb" [src]="theme(m).cover_image" alt="cover" /> }
                <input type="file" accept="image/*" (change)="uploadTheme(m, 'cover_image', $event)" />
                @if (theme(m).cover_image) { <button class="btn btn-sm btn-ghost" (click)="setTheme(m, 'cover_image', '')">Retirer</button> }
              </div>
            </div>
            <p class="muted" style="font-size:.8rem">Le logo de l'entreprise s'affiche automatiquement en tête du formulaire public.</p>
          </div>

          <!-- Sections & questions -->
          <div class="card stack">
            <div class="row between">
              <h3>Sections & questions</h3>
              <button class="btn btn-sm btn-primary" (click)="addSection(m)">+ Section</button>
            </div>

            @for (sec of sections(m); track sec.id; let si = $index) {
              <div class="section-card">
                <div class="section-head">
                  <input class="sec-title" [(ngModel)]="sec.title" placeholder="Titre de la section" />
                  <div class="row" style="gap:.2rem">
                    <button class="btn btn-xs btn-ghost" (click)="moveSection(m, si, -1)" [disabled]="si===0">↑</button>
                    <button class="btn btn-xs btn-ghost" (click)="moveSection(m, si, 1)" [disabled]="si===sections(m).length-1">↓</button>
                    <button class="btn btn-xs btn-danger" (click)="removeSection(m, si)">✕</button>
                  </div>
                </div>
                <textarea class="sec-desc" [(ngModel)]="sec.description" rows="1" placeholder="Description de la section (facultatif)"></textarea>

                @for (el of sec.elements; track $index; let ei = $index) {
                  <div class="element" [class.content]="el.kind==='content'">
                    @if (el.kind === 'content') {
                      <!-- Bloc d'information fixe -->
                      <div class="el-head">
                        <span class="tag">Info · {{ contentLabel(asContent(el).content_type) }}</span>
                        <div class="row" style="gap:.2rem">
                          <button class="btn btn-xs btn-ghost" (click)="moveEl(sec, ei, -1)" [disabled]="ei===0">↑</button>
                          <button class="btn btn-xs btn-ghost" (click)="moveEl(sec, ei, 1)" [disabled]="ei===sec.elements.length-1">↓</button>
                          <button class="btn btn-xs btn-danger" (click)="removeEl(sec, ei)">✕</button>
                        </div>
                      </div>
                      <div class="row" style="gap:.4rem;flex-wrap:wrap">
                        <select [(ngModel)]="asContent(el).content_type" style="width:150px">
                          <option value="text">Texte</option>
                          <option value="image">Image</option>
                          <option value="file">Fichier</option>
                        </select>
                        <input [(ngModel)]="asContent(el).title" placeholder="Titre (facultatif)" style="flex:1;min-width:140px" />
                      </div>
                      @if (asContent(el).content_type === 'text') {
                        <textarea [(ngModel)]="asContent(el).text" rows="2" placeholder="Texte affiché entre les questions"></textarea>
                      } @else {
                        <div class="upload-row">
                          @if (asContent(el).url) {
                            @if (asContent(el).content_type === 'image') { <img class="thumb" [src]="asContent(el).url" alt="" /> }
                            @else { <span class="fname">📎 {{ asContent(el).name }}</span> }
                          }
                          <input type="file" [accept]="asContent(el).content_type === 'image' ? 'image/*' : '*'" (change)="uploadContent(asContent(el), $event)" />
                        </div>
                      }
                    } @else {
                      <!-- Question -->
                      <div class="el-head">
                        <input class="q-label" [ngModel]="asQuestion(el).label" (ngModelChange)="asQuestion(el).label = $event; syncKey(asQuestion(el))" placeholder="Intitulé de la question" />
                        <div class="row" style="gap:.2rem">
                          <button class="btn btn-xs btn-ghost" (click)="moveEl(sec, ei, -1)" [disabled]="ei===0">↑</button>
                          <button class="btn btn-xs btn-ghost" (click)="moveEl(sec, ei, 1)" [disabled]="ei===sec.elements.length-1">↓</button>
                          <button class="btn btn-xs btn-danger" (click)="removeEl(sec, ei)">✕</button>
                        </div>
                      </div>
                      <input class="q-hint" [(ngModel)]="asQuestion(el).hint" placeholder="Aide / précision (hint)" />
                      <div class="row" style="gap:.4rem;flex-wrap:wrap;align-items:center">
                        <select [(ngModel)]="asQuestion(el).type" style="width:210px">
                          @for (t of questionTypes; track t.value) { <option [value]="t.value">{{ t.label }}</option> }
                        </select>
                        <label class="chk"><input type="checkbox" [(ngModel)]="asQuestion(el).required" /> Requis</label>
                      </div>

                      @if (hasOptions(asQuestion(el).type)) {
                        <input [ngModel]="(asQuestion(el).options ?? []).join(', ')" (ngModelChange)="setOptions(asQuestion(el), $event)" placeholder="Options séparées par des virgules" />
                      }
                      @if (asQuestion(el).type === 'scale') {
                        <div class="row" style="gap:.4rem;flex-wrap:wrap">
                          <span class="mini">Min</span><input type="number" [(ngModel)]="asQuestion(el).scale_min" style="width:64px" />
                          <span class="mini">Max</span><input type="number" [(ngModel)]="asQuestion(el).scale_max" style="width:64px" />
                          <input [(ngModel)]="asQuestion(el).scale_min_label" placeholder="Étiquette min" style="flex:1;min-width:120px" />
                          <input [(ngModel)]="asQuestion(el).scale_max_label" placeholder="Étiquette max" style="flex:1;min-width:120px" />
                        </div>
                      }
                      @if (asQuestion(el).type === 'rating') {
                        <div class="row" style="gap:.4rem"><span class="mini">Nombre d'étoiles</span>
                          <input type="number" min="3" max="10" [(ngModel)]="asQuestion(el).rating_max" style="width:70px" /></div>
                      }
                      @if (asQuestion(el).type === 'slot') {
                        <input [ngModel]="(asQuestion(el).slots ?? []).join(', ')" (ngModelChange)="setSlots(asQuestion(el), $event)" placeholder="Créneaux proposés (ex : Lun 9h, Lun 14h…) — vide = choix libre" />
                      }

                      <div class="q-extras">
                        <div class="upload-row">
                          <span class="mini">Image d'illustration</span>
                          @if (asQuestion(el).image) { <img class="thumb" [src]="asQuestion(el).image" alt="" /> }
                          <input type="file" accept="image/*" (change)="uploadQ(asQuestion(el), 'image', $event)" />
                          @if (asQuestion(el).image) { <button class="btn btn-xs btn-ghost" (click)="asQuestion(el).image = ''">✕</button> }
                        </div>
                        <div class="upload-row">
                          <span class="mini">Fichier modèle</span>
                          @if (asQuestion(el).template_file) { <span class="fname">📎 {{ asQuestion(el).template_file_name || 'modèle' }}</span> }
                          <input type="file" (change)="uploadQ(asQuestion(el), 'template_file', $event)" />
                          @if (asQuestion(el).template_file) { <button class="btn btn-xs btn-ghost" (click)="asQuestion(el).template_file = ''; asQuestion(el).template_file_name = ''">✕</button> }
                        </div>
                      </div>
                    }
                  </div>
                }

                <div class="row" style="gap:.4rem;margin-top:.4rem">
                  <button class="btn btn-sm btn-ghost" (click)="addQuestion(sec)">+ Question</button>
                  <button class="btn btn-sm btn-ghost" (click)="addContent(sec)">+ Information fixe</button>
                </div>
              </div>
            }
            @if (!sections(m).length) { <small>Aucune section. Ajoutez-en une.</small> }
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
    }
  `,
  styles: [`
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; align-items: start; }
    @media (max-width: 900px) { .grid-2 { grid-template-columns: 1fr; } }
    .chk { display: flex; align-items: center; gap: 0.3rem; font-size: 0.85rem; font-weight: 600; white-space: nowrap; }
    .chk input, .upload-row input[type=file] { width: auto; }
    .linkbox { display: flex; gap: 0.4rem; }
    .linkbox input { font-family: ui-monospace, monospace; font-size: 0.8rem; }
    .sub { border-bottom: 1px solid var(--border); padding: 0.6rem 0; font-size: 0.85rem; }
    .sub:last-child { border-bottom: none; }
    .diag-card { border: 1px solid var(--border); border-radius: 10px; padding: .5rem; margin-bottom: .7rem; background: #fff; }
    .diag-card img { width: 100%; border-radius: 6px; }
    .diag-empty { padding: 1.2rem .6rem; color: var(--muted); font-size: .82rem; text-align: center; }
    .section-card { border: 1px solid var(--border); border-radius: 12px; padding: .7rem; margin-bottom: .8rem; background: var(--bg); }
    .section-head { display: flex; gap: .5rem; align-items: center; }
    .sec-title { font-weight: 700; flex: 1; }
    .sec-desc { width: 100%; margin: .3rem 0 .5rem; }
    .element { border: 1px solid var(--border); border-radius: 10px; padding: .55rem; margin: .45rem 0; background: #fff; display: flex; flex-direction: column; gap: .35rem; }
    .element.content { background: #fafbfc; border-style: dashed; }
    .el-head { display: flex; gap: .5rem; align-items: center; }
    .q-label { flex: 1; font-weight: 600; }
    .q-hint { font-size: .85rem; }
    .q-extras { display: flex; flex-direction: column; gap: .3rem; border-top: 1px dashed var(--border); padding-top: .4rem; }
    .upload-row { display: flex; align-items: center; gap: .5rem; flex-wrap: wrap; font-size: .82rem; }
    .thumb { height: 40px; border-radius: 6px; border: 1px solid var(--border); }
    .fname { font-size: .8rem; color: var(--muted); }
    .mini { font-size: .74rem; color: var(--muted); }
    .tag { display: inline-block; font-size: .7rem; font-weight: 700; color: var(--muted); }
    .btn-xs { padding: .1rem .4rem; font-size: .72rem; }
  `],
})
export class FormBuilder {
  private service = inject(FormService);
  private projectSvc = inject(ProjectService);
  private docSvc = inject(DocumentService);
  private toast = inject(ToastService);
  private router = inject(Router);

  @Input() id?: string;

  questionTypes = QUESTION_TYPES;
  model = signal<OnlineForm | null>(null);
  projects = signal<Project[]>([]);
  confidentialityLevels = signal<Choice[]>([]);
  submissions = signal<FormSubmission[]>([]);
  saving = signal(false);
  reporting = signal(false);
  subCount = signal(0);
  private diagramUrls = signal<Record<string, string>>({});

  imgUrl(id: string): string | null { return this.diagramUrls()[id] ?? null; }

  constructor() {
    this.projectSvc.list().subscribe((r) => this.projects.set(r.results));
    this.docSvc.choices().subscribe((c) => this.confidentialityLevels.set(c.confidentiality_levels));
    setTimeout(() => {
      if (this.id) {
        this.service.get(+this.id).subscribe((f) => { this.model.set(this.normalize(f)); this.loadDiagrams(); });
        this.service.submissions(+this.id).subscribe((s) => this.submissions.set(s));
      } else {
        this.model.set({
          title: '', description: '', project: null,
          schema: [this.blankSection()], diagrams: [],
          confidentiality: 'internal', is_open: true, show_progress: true,
          theme: { layout: 'card', accent: '#ec6608', background: '#f4f5f7' },
          success_message: 'Merci, votre réponse a bien été enregistrée.',
        });
      }
    });
  }

  isEdit() { return !!this.id; }

  // ---- normalisation schéma (plat -> sections) ----
  private normalize(f: OnlineForm): OnlineForm {
    const raw = (f.schema || []) as any[];
    const hasSections = raw.some((it) => it && it.kind === 'section');
    if (!hasSections) {
      const elements = raw.map((q) => ({ kind: 'question', ...q })) as any;
      f.schema = [{ kind: 'section', id: newId('s'), title: '', description: '', elements }];
    }
    if (!f.theme) f.theme = { layout: 'card', accent: '#ec6608', background: '#f4f5f7' };
    if (f.show_progress === undefined) f.show_progress = true;
    return f;
  }
  private blankSection(): FormSection { return { kind: 'section', id: newId('s'), title: '', description: '', elements: [] }; }
  sections(m: OnlineForm): FormSection[] { return (m.schema || []) as FormSection[]; }
  asQuestion(el: any): FormField { return el as FormField; }
  asContent(el: any): FormContent { return el as FormContent; }

  // ---- thème ----
  theme(m: OnlineForm) { return m.theme || (m.theme = {}); }
  setTheme(m: OnlineForm, key: string, val: any) { (this.theme(m) as any)[key] = val; this.model.set({ ...m }); }

  // ---- sections & éléments ----
  addSection(m: OnlineForm) { this.sections(m).push(this.blankSection()); this.model.set({ ...m }); }
  removeSection(m: OnlineForm, i: number) { this.sections(m).splice(i, 1); this.model.set({ ...m }); }
  moveSection(m: OnlineForm, i: number, d: number) {
    const s = this.sections(m); const j = i + d; if (j < 0 || j >= s.length) return;
    [s[i], s[j]] = [s[j], s[i]]; this.model.set({ ...m });
  }
  addQuestion(sec: FormSection) {
    sec.elements.push({ kind: 'question', key: '', label: '', type: 'text', required: false } as FormField);
    this.model.set({ ...this.model()! });
  }
  addContent(sec: FormSection) {
    sec.elements.push({ kind: 'content', id: newId('c'), content_type: 'text', title: '', text: '' } as FormContent);
    this.model.set({ ...this.model()! });
  }
  removeEl(sec: FormSection, i: number) { sec.elements.splice(i, 1); this.model.set({ ...this.model()! }); }
  moveEl(sec: FormSection, i: number, d: number) {
    const j = i + d; if (j < 0 || j >= sec.elements.length) return;
    [sec.elements[i], sec.elements[j]] = [sec.elements[j], sec.elements[i]];
    this.model.set({ ...this.model()! });
  }

  hasOptions(t: QuestionType) { return t === 'select' || t === 'radio' || t === 'checkboxes'; }
  contentLabel(t: string) { return ({ text: 'Texte', image: 'Image', file: 'Fichier' } as any)[t] || t; }

  syncKey(f: FormField) {
    f.key = (f.label || '').toLowerCase().normalize('NFD')
      .replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '') || 'champ';
  }
  setOptions(f: FormField, raw: string) { f.options = raw.split(',').map((s) => s.trim()).filter(Boolean); }
  setSlots(f: FormField, raw: string) { f.slots = raw.split(',').map((s) => s.trim()).filter(Boolean); }

  // ---- téléversements ----
  private pick(ev: Event): File | null {
    const input = ev.target as HTMLInputElement;
    return input.files && input.files.length ? input.files[0] : null;
  }
  uploadQ(f: FormField, key: 'image' | 'template_file', ev: Event) {
    const file = this.pick(ev); if (!file) return;
    this.service.uploadAsset(file).subscribe({
      next: (r) => { (f as any)[key] = r.url; if (key === 'template_file') f.template_file_name = r.name; this.model.set({ ...this.model()! }); },
      error: () => this.toast.error('Téléversement impossible.'),
    });
  }
  uploadContent(c: FormContent, ev: Event) {
    const file = this.pick(ev); if (!file) return;
    this.service.uploadAsset(file).subscribe({
      next: (r) => { c.url = r.url; c.name = r.name; this.model.set({ ...this.model()! }); },
      error: () => this.toast.error('Téléversement impossible.'),
    });
  }
  uploadTheme(m: OnlineForm, key: string, ev: Event) {
    const file = this.pick(ev); if (!file) return;
    this.service.uploadAsset(file).subscribe({
      next: (r) => this.setTheme(m, key, r.url),
      error: () => this.toast.error('Téléversement impossible.'),
    });
  }

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
    // Clés des questions
    for (const sec of this.sections(m)) {
      for (const el of sec.elements) {
        if ((el as any).kind !== 'content') this.syncKey(el as FormField);
      }
    }
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
}
