import { Component, inject, signal, computed, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FormService } from '@core/services/form.service';
import { OnlineForm, FormSection, FormField, FormContent } from '@core/models';

@Component({
  selector: 'app-public-form',
  imports: [FormsModule],
  templateUrl: './public-form.html',
  styleUrl: './public-form.scss',
})
export class PublicForm {
  private service = inject(FormService);
  @Input() code!: string;

  form = signal<OnlineForm | null>(null);
  loading = signal(true);
  notFound = signal(false);
  submitted = signal(false);
  sending = signal(false);
  uploading = signal<string | null>(null);
  error = signal('');
  successMessage = signal('');

  private data: Record<string, any> = {};

  logo = computed(() => this.form()?.logoUrl || null);
  companyName = computed(() => this.form()?.companyName || null);
  showProgress = computed(() => this.form()?.showProgress !== false);
  layout = computed(() => this.form()?.theme?.layout || 'card');
  cover = computed(() => this.form()?.theme?.cover_image || null);
  bg = computed(() => this.form()?.theme?.background || '#f4f5f7');
  accent = computed(() => this.form()?.theme?.accent || '#ec6608');
  buttonLabel = computed(() => this.form()?.theme?.button_label || 'Envoyer');

  sections = computed<FormSection[]>(() => {
    const f = this.form(); if (!f) return [];
    const raw = (f.schema || []) as any[];
    if (raw.some((it) => it && it.kind === 'section')) return raw as FormSection[];
    const elements = raw.map((q) => ({ kind: 'question', ...q }));
    return [{ kind: 'section', id: 's1', title: '', description: '', elements } as FormSection];
  });

  private allQuestions(): FormField[] {
    const out: FormField[] = [];
    for (const s of this.sections()) for (const el of s.elements) if ((el as any).kind !== 'content') out.push(el as FormField);
    return out;
  }
  totalCount() { return this.allQuestions().length; }
  answeredCount() { return this.allQuestions().filter((q) => this.isAnswered(q)).length; }
  progress() { const t = this.totalCount(); return t ? Math.round((this.answeredCount() / t) * 100) : 0; }

  constructor() {
    setTimeout(() => {
      this.service.publicForm(this.code).subscribe({
        next: (f) => {
          this.form.set(f);
          this.successMessage.set(f.successMessage);
          document.documentElement.style.setProperty('--pf-accent', f.theme?.accent || '#ec6608');
          (document.querySelector('app-public-form') as HTMLElement)?.style.setProperty('--pf-accent', f.theme?.accent || '#ec6608');
          this.loading.set(false);
        },
        error: () => { this.notFound.set(true); this.loading.set(false); },
      });
    });
  }

  isContent(el: any) { return el && el.kind === 'content'; }
  asC(el: any): FormContent { return el as FormContent; }
  asQ(el: any): FormField { return el as FormField; }

  inputType(t: string) {
    return t === 'number' ? 'number' : t === 'email' ? 'email' : t === 'date' ? 'date' : t === 'time' ? 'time' : 'text';
  }
  scaleRange(q: FormField): number[] {
    const min = q.scale_min ?? 1, max = q.scale_max ?? 5;
    const r: number[] = []; for (let i = min; i <= max && r.length < 20; i++) r.push(i); return r;
  }
  starRange(q: FormField): number[] {
    const n = q.rating_max ?? 5; return Array.from({ length: n }, (_, i) => i + 1);
  }

  value(key: string) { return this.data[key] ?? ''; }
  setValue(key: string, v: any) { this.data[key] = v; }
  isChecked(key: string, opt: string) { return Array.isArray(this.data[key]) && this.data[key].includes(opt); }
  toggle(key: string, opt: string) {
    const cur: string[] = Array.isArray(this.data[key]) ? this.data[key] : [];
    this.data[key] = cur.includes(opt) ? cur.filter((o) => o !== opt) : [...cur, opt];
  }
  fileName(key: string) { const v = this.data[key]; return v && typeof v === 'object' ? v.name : ''; }

  private isAnswered(q: FormField): boolean {
    const v = this.data[q.key];
    if (q.type === 'checkboxes') return Array.isArray(v) && v.length > 0;
    if (q.type === 'checkbox') return v === true;
    if (q.type === 'file') return !!v;
    if (q.type === 'scale' || q.type === 'rating') return v !== undefined && v !== '' && v !== null;
    return String(v ?? '').trim() !== '';
  }

  onFile(key: string, ev: Event) {
    const input = ev.target as HTMLInputElement;
    const file = input.files && input.files.length ? input.files[0] : null;
    if (!file) return;
    this.uploading.set(key);
    this.service.publicUpload(this.code, key, file).subscribe({
      next: (r) => { this.data[key] = { url: r.url, name: r.name }; this.uploading.set(null); },
      error: () => { this.uploading.set(null); this.error.set("Le fichier n'a pas pu être envoyé."); },
    });
  }

  submit() {
    const f = this.form(); if (!f) return;
    const missing = this.allQuestions().filter((q) => q.required && !this.isAnswered(q));
    if (missing.length) {
      this.error.set('Champs obligatoires : ' + missing.map((q) => q.label).join(', '));
      return;
    }
    this.error.set('');
    this.sending.set(true);
    this.service.submit(this.code, this.data).subscribe({
      next: (r) => { this.sending.set(false); this.successMessage.set(r.detail); this.submitted.set(true); },
      error: (e) => { this.sending.set(false); this.error.set(e?.error?.detail ?? "Erreur lors de l'envoi."); },
    });
  }
}
