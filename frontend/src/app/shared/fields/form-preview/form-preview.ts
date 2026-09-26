import { Component, Input, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FormContent, FormField, FormSection, FormTheme } from '@core/models';

/**
 * Aperçu (lecture) d'un formulaire tel que vu par le répondant : logo, thème,
 * sections, tous les types de questions, barre de progression. Purement visuel
 * (aucune soumission). Réutilisé par les éditeurs de formulaire et de modèle.
 */
@Component({
  selector: 'app-form-preview',
  imports: [FormsModule],
  templateUrl: './form-preview.html',
  styleUrl: './form-preview.scss',
})
export class FormPreview {
  @Input() title = '';
  @Input() description = '';
  @Input() sections: FormSection[] = [];
  @Input() theme: FormTheme | null = null;
  @Input() showProgress = true;
  @Input() logoUrl: string | null = null;
  @Input() companyName: string | null = null;

  private data = signal<Record<string, any>>({});

  accent = computed(() => this.theme?.accent || '#ec6608');
  bg = computed(() => this.theme?.background || '#f4f5f7');
  layout = computed(() => this.theme?.layout || 'card');

  isContent(el: any) { return el && el.kind === 'content'; }
  asC(el: any): FormContent { return el as FormContent; }
  asQ(el: any): FormField { return el as FormField; }
  inputType(t: string) { return t === 'number' ? 'number' : t === 'email' ? 'email' : t === 'date' ? 'date' : t === 'time' ? 'time' : 'text'; }
  scaleRange(q: FormField): number[] { const a = q.scale_min ?? 1, b = q.scale_max ?? 5, r: number[] = []; for (let i = a; i <= b && r.length < 20; i++) r.push(i); return r; }
  starRange(q: FormField): number[] { return Array.from({ length: q.rating_max ?? 5 }, (_, i) => i + 1); }

  val(k: string) { return this.data()[k] ?? ''; }
  set(k: string, v: any) { this.data.update((d) => ({ ...d, [k]: v })); }
  checked(k: string, o: string) { const v = this.data()[k]; return Array.isArray(v) && v.includes(o); }
  toggle(k: string, o: string) {
    const cur: string[] = Array.isArray(this.data()[k]) ? this.data()[k] : [];
    this.set(k, cur.includes(o) ? cur.filter((x) => x !== o) : [...cur, o]);
  }

  private allQ(): FormField[] {
    const out: FormField[] = [];
    for (const s of this.sections) for (const el of s.elements) if ((el as any).kind !== 'content') out.push(el as FormField);
    return out;
  }
  private isAnswered(q: FormField) {
    const v = this.data()[q.key];
    if (q.type === 'checkboxes') return Array.isArray(v) && v.length > 0;
    if (q.type === 'checkbox') return v === true;
    if (q.type === 'scale' || q.type === 'rating') return v !== undefined && v !== '' && v !== null;
    return String(v ?? '').trim() !== '';
  }
  total() { return this.allQ().length; }
  answered() { return this.allQ().filter((q) => this.isAnswered(q)).length; }
  progress() { const t = this.total(); return t ? Math.round((this.answered() / t) * 100) : 0; }
}
