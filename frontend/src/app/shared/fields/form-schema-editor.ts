import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FormService } from '@core/services/form.service';
import { ToastService } from '@core/services/api.service';
import { FormContent, FormField, FormSection, QuestionType } from '@core/models';

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

/** Éditeur partagé de sections / questions / informations fixes d'un formulaire. */
@Component({
  selector: 'app-form-schema-editor',
  imports: [FormsModule],
  template: `
    <div class="card stack">
      <div class="row between">
        <h3>Sections & questions</h3>
        <button class="btn btn-sm btn-primary" (click)="addSection()">+ Section</button>
      </div>

      @for (sec of sections; track sec.id; let si = $index) {
        <div class="section-card">
          <div class="section-head">
            <input class="sec-title" [(ngModel)]="sec.title" (ngModelChange)="emit()" placeholder="Titre de la section" />
            <div class="row" style="gap:.2rem">
              <button class="btn btn-xs btn-ghost" (click)="moveSection(si, -1)" [disabled]="si===0">↑</button>
              <button class="btn btn-xs btn-ghost" (click)="moveSection(si, 1)" [disabled]="si===sections.length-1">↓</button>
              <button class="btn btn-xs btn-danger" (click)="removeSection(si)">✕</button>
            </div>
          </div>
          <textarea class="sec-desc" [(ngModel)]="sec.description" (ngModelChange)="emit()" rows="1" placeholder="Description de la section (facultatif)"></textarea>

          @for (el of sec.elements; track $index; let ei = $index) {
            <div class="element" [class.content]="el.kind==='content'">
              @if (el.kind === 'content') {
                <div class="el-head">
                  <span class="tag">Info · {{ contentLabel(asC(el).content_type) }}</span>
                  <div class="row" style="gap:.2rem">
                    <button class="btn btn-xs btn-ghost" (click)="moveEl(sec, ei, -1)" [disabled]="ei===0">↑</button>
                    <button class="btn btn-xs btn-ghost" (click)="moveEl(sec, ei, 1)" [disabled]="ei===sec.elements.length-1">↓</button>
                    <button class="btn btn-xs btn-danger" (click)="removeEl(sec, ei)">✕</button>
                  </div>
                </div>
                <div class="row" style="gap:.4rem;flex-wrap:wrap">
                  <select [(ngModel)]="asC(el).content_type" (ngModelChange)="emit()" style="width:150px">
                    <option value="text">Texte</option>
                    <option value="image">Image</option>
                    <option value="file">Fichier</option>
                  </select>
                  <input [(ngModel)]="asC(el).title" (ngModelChange)="emit()" placeholder="Titre (facultatif)" style="flex:1;min-width:140px" />
                </div>
                @if (asC(el).content_type === 'text') {
                  <textarea [(ngModel)]="asC(el).text" (ngModelChange)="emit()" rows="2" placeholder="Texte affiché entre les questions"></textarea>
                } @else {
                  <div class="upload-row">
                    @if (asC(el).url) {
                      @if (asC(el).content_type === 'image') { <img class="thumb" [src]="asC(el).url" alt="" /> }
                      @else { <span class="fname">📎 {{ asC(el).name }}</span> }
                    }
                    <input type="file" [accept]="asC(el).content_type === 'image' ? 'image/*' : '*'" (change)="uploadContent(asC(el), $event)" />
                  </div>
                }
              } @else {
                <div class="el-head">
                  <input class="q-label" [ngModel]="asQ(el).label" (ngModelChange)="asQ(el).label = $event; syncKey(asQ(el)); emit()" placeholder="Intitulé de la question" />
                  <div class="row" style="gap:.2rem">
                    <button class="btn btn-xs btn-ghost" (click)="moveEl(sec, ei, -1)" [disabled]="ei===0">↑</button>
                    <button class="btn btn-xs btn-ghost" (click)="moveEl(sec, ei, 1)" [disabled]="ei===sec.elements.length-1">↓</button>
                    <button class="btn btn-xs btn-danger" (click)="removeEl(sec, ei)">✕</button>
                  </div>
                </div>
                <input class="q-hint" [(ngModel)]="asQ(el).hint" (ngModelChange)="emit()" placeholder="Aide / précision (hint)" />
                <div class="row" style="gap:.4rem;flex-wrap:wrap;align-items:center">
                  <select [(ngModel)]="asQ(el).type" (ngModelChange)="emit()" style="width:210px">
                    @for (t of questionTypes; track t.value) { <option [value]="t.value">{{ t.label }}</option> }
                  </select>
                  <label class="chk"><input type="checkbox" [(ngModel)]="asQ(el).required" (ngModelChange)="emit()" /> Requis</label>
                </div>

                @if (hasOptions(asQ(el).type)) {
                  <input [ngModel]="(asQ(el).options ?? []).join(', ')" (ngModelChange)="setOptions(asQ(el), $event)" placeholder="Options séparées par des virgules" />
                }
                @if (asQ(el).type === 'scale') {
                  <div class="row" style="gap:.4rem;flex-wrap:wrap">
                    <span class="mini">Min</span><input type="number" [(ngModel)]="asQ(el).scale_min" (ngModelChange)="emit()" style="width:64px" />
                    <span class="mini">Max</span><input type="number" [(ngModel)]="asQ(el).scale_max" (ngModelChange)="emit()" style="width:64px" />
                    <input [(ngModel)]="asQ(el).scale_min_label" (ngModelChange)="emit()" placeholder="Étiquette min" style="flex:1;min-width:120px" />
                    <input [(ngModel)]="asQ(el).scale_max_label" (ngModelChange)="emit()" placeholder="Étiquette max" style="flex:1;min-width:120px" />
                  </div>
                }
                @if (asQ(el).type === 'rating') {
                  <div class="row" style="gap:.4rem"><span class="mini">Nombre d'étoiles</span>
                    <input type="number" min="3" max="10" [(ngModel)]="asQ(el).rating_max" (ngModelChange)="emit()" style="width:70px" /></div>
                }
                @if (asQ(el).type === 'slot') {
                  <input [ngModel]="(asQ(el).slots ?? []).join(', ')" (ngModelChange)="setSlots(asQ(el), $event)" placeholder="Créneaux proposés (ex : Lun 9h, Lun 14h…) — vide = choix libre" />
                }

                <div class="q-extras">
                  <div class="upload-row">
                    <span class="mini">Image d'illustration</span>
                    @if (asQ(el).image) { <img class="thumb" [src]="asQ(el).image" alt="" /> }
                    <input type="file" accept="image/*" (change)="uploadQ(asQ(el), 'image', $event)" />
                    @if (asQ(el).image) { <button class="btn btn-xs btn-ghost" (click)="asQ(el).image = ''; emit()">✕</button> }
                  </div>
                  <div class="upload-row">
                    <span class="mini">Fichier modèle</span>
                    @if (asQ(el).template_file) { <span class="fname">📎 {{ asQ(el).template_file_name || 'modèle' }}</span> }
                    <input type="file" (change)="uploadQ(asQ(el), 'template_file', $event)" />
                    @if (asQ(el).template_file) { <button class="btn btn-xs btn-ghost" (click)="asQ(el).template_file = ''; asQ(el).template_file_name = ''; emit()">✕</button> }
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
      @if (!sections.length) { <small>Aucune section. Ajoutez-en une.</small> }
    </div>
  `,
  styles: [`
    .chk { display:flex; align-items:center; gap:.3rem; font-size:.85rem; font-weight:600; white-space:nowrap; }
    .chk input, .upload-row input[type=file] { width:auto; }
    .section-card { border:1px solid var(--border); border-radius:12px; padding:.7rem; margin-bottom:.8rem; background:var(--bg); }
    .section-head { display:flex; gap:.5rem; align-items:center; }
    .sec-title { font-weight:700; flex:1; }
    .sec-desc { width:100%; margin:.3rem 0 .5rem; }
    .element { border:1px solid var(--border); border-radius:10px; padding:.55rem; margin:.45rem 0; background:#fff; display:flex; flex-direction:column; gap:.35rem; }
    .element.content { background:#fafbfc; border-style:dashed; }
    .el-head { display:flex; gap:.5rem; align-items:center; }
    .q-label { flex:1; font-weight:600; }
    .q-hint { font-size:.85rem; }
    .q-extras { display:flex; flex-direction:column; gap:.3rem; border-top:1px dashed var(--border); padding-top:.4rem; }
    .upload-row { display:flex; align-items:center; gap:.5rem; flex-wrap:wrap; font-size:.82rem; }
    .thumb { height:40px; border-radius:6px; border:1px solid var(--border); }
    .fname { font-size:.8rem; color:var(--muted); }
    .mini { font-size:.74rem; color:var(--muted); }
    .tag { display:inline-block; font-size:.7rem; font-weight:700; color:var(--muted); }
    .btn-xs { padding:.1rem .4rem; font-size:.72rem; }
  `],
})
export class FormSchemaEditor {
  private service = inject(FormService);
  private toast = inject(ToastService);

  @Input() sections!: FormSection[];
  @Output() changed = new EventEmitter<void>();

  questionTypes = QUESTION_TYPES;

  emit() { this.changed.emit(); }
  asQ(el: any): FormField { return el as FormField; }
  asC(el: any): FormContent { return el as FormContent; }

  blankSection(): FormSection { return { kind: 'section', id: newId('s'), title: '', description: '', elements: [] }; }
  addSection() { this.sections.push(this.blankSection()); this.emit(); }
  removeSection(i: number) { this.sections.splice(i, 1); this.emit(); }
  moveSection(i: number, d: number) {
    const j = i + d; if (j < 0 || j >= this.sections.length) return;
    [this.sections[i], this.sections[j]] = [this.sections[j], this.sections[i]]; this.emit();
  }
  addQuestion(sec: FormSection) {
    sec.elements.push({ kind: 'question', key: '', label: '', type: 'text', required: false } as FormField); this.emit();
  }
  addContent(sec: FormSection) {
    sec.elements.push({ kind: 'content', id: newId('c'), content_type: 'text', title: '', text: '' } as FormContent); this.emit();
  }
  removeEl(sec: FormSection, i: number) { sec.elements.splice(i, 1); this.emit(); }
  moveEl(sec: FormSection, i: number, d: number) {
    const j = i + d; if (j < 0 || j >= sec.elements.length) return;
    [sec.elements[i], sec.elements[j]] = [sec.elements[j], sec.elements[i]]; this.emit();
  }

  hasOptions(t: QuestionType) { return t === 'select' || t === 'radio' || t === 'checkboxes'; }
  contentLabel(t: string) { return ({ text: 'Texte', image: 'Image', file: 'Fichier' } as any)[t] || t; }
  syncKey(f: FormField) {
    f.key = (f.label || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'champ';
  }
  setOptions(f: FormField, raw: string) { f.options = raw.split(',').map((s) => s.trim()).filter(Boolean); this.emit(); }
  setSlots(f: FormField, raw: string) { f.slots = raw.split(',').map((s) => s.trim()).filter(Boolean); this.emit(); }

  private pick(ev: Event): File | null {
    const input = ev.target as HTMLInputElement;
    return input.files && input.files.length ? input.files[0] : null;
  }
  uploadQ(f: FormField, key: 'image' | 'template_file', ev: Event) {
    const file = this.pick(ev); if (!file) return;
    this.service.uploadAsset(file).subscribe({
      next: (r) => { (f as any)[key] = r.url; if (key === 'template_file') f.template_file_name = r.name; this.emit(); },
      error: () => this.toast.error('Téléversement impossible.'),
    });
  }
  uploadContent(c: FormContent, ev: Event) {
    const file = this.pick(ev); if (!file) return;
    this.service.uploadAsset(file).subscribe({
      next: (r) => { c.url = r.url; c.name = r.name; this.emit(); },
      error: () => this.toast.error('Téléversement impossible.'),
    });
  }

  /** Normalise un schéma (plat ou sections) en tableau de sections mutable. */
  static toSections(raw: any[]): FormSection[] {
    raw = raw || [];
    if (raw.some((it) => it && it.kind === 'section')) return raw as FormSection[];
    const elements = raw.map((q) => ({ kind: 'question', ...q }));
    return [{ kind: 'section', id: newId('s'), title: '', description: '', elements } as FormSection];
  }
  /** Aplati toutes les questions d'un schéma par sections. */
  static questions(sections: FormSection[]): FormField[] {
    const out: FormField[] = [];
    for (const s of sections) for (const el of s.elements) if ((el as any).kind !== 'content') out.push(el as FormField);
    return out;
  }
}
