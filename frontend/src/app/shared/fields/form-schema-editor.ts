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
  templateUrl: './form-schema-editor.html',
  styleUrl: './form-schema-editor.scss',
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
