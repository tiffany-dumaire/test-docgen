import { Component, inject, signal, computed, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FormService } from '../../core/services/form.service';
import { OnlineForm, FormSection, FormField, FormContent } from '../../core/models';

@Component({
  selector: 'app-public-form',
  imports: [FormsModule],
  template: `
    <div class="pf-wrap" [style.background]="bg()">
      @if (loading()) {
        <div class="pf-card"><p class="muted">Chargement…</p></div>
      } @else if (notFound()) {
        <div class="pf-card"><h2>Formulaire introuvable</h2><p class="muted">Ce lien n'est pas valide ou a expiré.</p></div>
      } @else if (submitted()) {
        <div class="pf-card center">
          @if (logo()) { <img class="pf-logo" [src]="logo()" alt="logo" /> }
          <div class="check">✓</div>
          <h2>Merci !</h2>
          <p>{{ successMessage() }}</p>
        </div>
      } @else if (form(); as f) {
        <div class="pf-doc" [class.cover]="layout()==='cover'" [class.plain]="layout()==='plain'">
          <!-- En-tête / bannière -->
          @if (layout()==='cover' && cover()) {
            <div class="pf-cover" [style.background-image]="'url(' + cover() + ')'">
              <div class="pf-cover-veil">
                @if (logo()) { <img class="pf-logo lg" [src]="logo()" alt="logo" /> }
                <h1>{{ f.title }}</h1>
              </div>
            </div>
          } @else {
            <div class="pf-header">
              @if (logo()) { <img class="pf-logo" [src]="logo()" alt="logo" /> }
              <h1>{{ f.title }}</h1>
            </div>
          }

          @if (f.description) { <p class="pf-desc">{{ f.description }}</p> }

          @if (!f.is_open) {
            <p class="closed">Ce formulaire n'accepte plus de réponses.</p>
          } @else {
            @if (showProgress()) {
              <div class="pf-progress"><div class="bar" [style.width.%]="progress()"></div></div>
              <div class="pf-progress-label muted">{{ answeredCount() }} / {{ totalCount() }} répondu(s)</div>
            }

            @for (sec of sections(); track sec.id) {
              <section class="pf-section">
                @if (sec.title) { <h2>{{ sec.title }}</h2> }
                @if (sec.description) { <p class="pf-sec-desc">{{ sec.description }}</p> }

                @for (el of sec.elements; track $index) {
                  @if (isContent(el)) {
                    <div class="pf-content">
                      @if (asC(el).title) { <h3>{{ asC(el).title }}</h3> }
                      @switch (asC(el).content_type) {
                        @case ('image') { @if (asC(el).url) { <img class="pf-cimg" [src]="asC(el).url" [alt]="asC(el).title || ''" /> } }
                        @case ('file') { @if (asC(el).url) { <a class="pf-file" [href]="asC(el).url" target="_blank" rel="noopener">📎 {{ asC(el).name || 'Télécharger le fichier' }}</a> } }
                        @default { @if (asC(el).text) { <p class="pf-ctext">{{ asC(el).text }}</p> } }
                      }
                    </div>
                  } @else {
                    <div class="pf-field">
                      <label class="pf-q">{{ asQ(el).label }} @if (asQ(el).required) { <span class="req">*</span> }</label>
                      @if (asQ(el).hint) { <div class="pf-hint">{{ asQ(el).hint }}</div> }
                      @if (asQ(el).image) { <img class="pf-qimg" [src]="asQ(el).image" alt="" /> }
                      @if (asQ(el).template_file) {
                        <a class="pf-file sm" [href]="asQ(el).template_file" target="_blank" rel="noopener">📎 Fichier modèle : {{ asQ(el).template_file_name || 'télécharger' }}</a>
                      }

                      @switch (asQ(el).type) {
                        @case ('textarea') {
                          <textarea rows="3" [ngModel]="value(asQ(el).key)" (ngModelChange)="setValue(asQ(el).key, $event)"></textarea>
                        }
                        @case ('select') {
                          <select [ngModel]="value(asQ(el).key)" (ngModelChange)="setValue(asQ(el).key, $event)">
                            <option value="">—</option>
                            @for (opt of asQ(el).options ?? []; track opt) { <option [value]="opt">{{ opt }}</option> }
                          </select>
                        }
                        @case ('radio') {
                          <div class="pf-choices">
                            @for (opt of asQ(el).options ?? []; track opt) {
                              <label class="opt"><input type="radio" [name]="asQ(el).key" [value]="opt" [ngModel]="value(asQ(el).key)" (ngModelChange)="setValue(asQ(el).key, $event)" /> <span>{{ opt }}</span></label>
                            }
                          </div>
                        }
                        @case ('checkboxes') {
                          <div class="pf-choices">
                            @for (opt of asQ(el).options ?? []; track opt) {
                              <label class="opt"><input type="checkbox" [checked]="isChecked(asQ(el).key, opt)" (change)="toggle(asQ(el).key, opt)" /> <span>{{ opt }}</span></label>
                            }
                          </div>
                        }
                        @case ('checkbox') {
                          <label class="opt"><input type="checkbox" [ngModel]="value(asQ(el).key)===true" (ngModelChange)="setValue(asQ(el).key, $event)" /> <span>Oui</span></label>
                        }
                        @case ('scale') {
                          <div class="pf-scale">
                            <span class="lbl">{{ asQ(el).scale_min_label }}</span>
                            @for (n of scaleRange(asQ(el)); track n) {
                              <button type="button" class="dot" [class.on]="value(asQ(el).key)===n" (click)="setValue(asQ(el).key, n)">{{ n }}</button>
                            }
                            <span class="lbl">{{ asQ(el).scale_max_label }}</span>
                          </div>
                        }
                        @case ('rating') {
                          <div class="pf-stars">
                            @for (n of starRange(asQ(el)); track n) {
                              <button type="button" class="star" [class.on]="(value(asQ(el).key)||0) >= n" (click)="setValue(asQ(el).key, n)">★</button>
                            }
                          </div>
                        }
                        @case ('slot') {
                          @if ((asQ(el).slots ?? []).length) {
                            <div class="pf-choices">
                              @for (opt of asQ(el).slots ?? []; track opt) {
                                <label class="opt"><input type="radio" [name]="asQ(el).key" [value]="opt" [ngModel]="value(asQ(el).key)" (ngModelChange)="setValue(asQ(el).key, $event)" /> <span>{{ opt }}</span></label>
                              }
                            </div>
                          } @else {
                            <input type="datetime-local" [ngModel]="value(asQ(el).key)" (ngModelChange)="setValue(asQ(el).key, $event)" />
                          }
                        }
                        @case ('file') {
                          <div class="pf-upload">
                            <input type="file" (change)="onFile(asQ(el).key, $event)" />
                            @if (fileName(asQ(el).key)) { <span class="fname">📎 {{ fileName(asQ(el).key) }}</span> }
                            @if (uploading()===asQ(el).key) { <span class="muted">Envoi…</span> }
                          </div>
                        }
                        @default {
                          <input [type]="inputType(asQ(el).type)" [ngModel]="value(asQ(el).key)" (ngModelChange)="setValue(asQ(el).key, $event)" />
                        }
                      }
                    </div>
                  }
                }
              </section>
            }

            @if (error()) { <p class="err">{{ error() }}</p> }
            <button class="pf-submit" (click)="submit()" [disabled]="sending()">{{ buttonLabel() }}</button>
          }

          <div class="pf-foot muted">{{ companyName() || 'DocuGen' }}</div>
        </div>
      }
    </div>
  `,
  styles: [`
    :host { --pf-accent: #ec6608; }
    .pf-wrap { min-height: 100vh; display: flex; flex-direction: column; align-items: center; padding: 2.5rem 1rem; }
    .pf-card { background:#fff; border-radius:16px; box-shadow:0 12px 40px rgba(15,23,42,.14); padding:2rem; width:600px; max-width:100%; }
    .pf-doc { background:#fff; border-radius:18px; box-shadow:0 16px 48px rgba(15,23,42,.16); width:640px; max-width:100%; overflow:hidden; }
    .pf-doc.plain { box-shadow:none; background:transparent; }
    .pf-header { display:flex; align-items:center; gap:1rem; padding:1.6rem 2rem .4rem; border-top:6px solid var(--pf-accent); }
    .pf-logo { height:40px; width:auto; } .pf-logo.lg { height:54px; }
    .pf-header h1 { margin:0; font-size:1.5rem; }
    .pf-cover { min-height:180px; background-size:cover; background-position:center; display:flex; align-items:flex-end; }
    .pf-cover-veil { width:100%; background:linear-gradient(transparent, rgba(0,0,0,.6)); color:#fff; padding:1.4rem 2rem; }
    .pf-cover-veil h1 { margin:.4rem 0 0; font-size:1.7rem; }
    .pf-desc { padding:0 2rem; color:#475569; }
    .pf-progress { height:8px; background:#e9edf3; border-radius:99px; margin:1rem 2rem .2rem; overflow:hidden; }
    .pf-progress .bar { height:100%; background:var(--pf-accent); transition:width .25s ease; }
    .pf-progress-label { padding:0 2rem; font-size:.76rem; }
    .pf-section { padding:1rem 2rem; border-top:1px solid #eef1f6; margin-top:.6rem; }
    .pf-section h2 { font-size:1.15rem; margin:.2rem 0; color:var(--pf-accent); }
    .pf-sec-desc { color:#64748b; margin:.1rem 0 .8rem; font-size:.9rem; }
    .pf-content { background:#f7f9fc; border-radius:10px; padding:.7rem .9rem; margin:.6rem 0; }
    .pf-content h3 { margin:.1rem 0 .3rem; font-size:1rem; }
    .pf-cimg { max-width:100%; border-radius:8px; } .pf-ctext { margin:.2rem 0; color:#334155; white-space:pre-line; }
    .pf-file { display:inline-block; color:var(--pf-accent); font-weight:600; text-decoration:none; }
    .pf-file.sm { font-size:.82rem; margin:.2rem 0; }
    .pf-field { margin:.9rem 0; display:flex; flex-direction:column; gap:.35rem; }
    .pf-q { font-weight:600; } .req { color:#e11d48; }
    .pf-hint { font-size:.82rem; color:#64748b; }
    .pf-qimg { max-width:100%; border-radius:8px; margin:.2rem 0; }
    .pf-field input:not([type=radio]):not([type=checkbox]):not([type=file]), .pf-field textarea, .pf-field select {
      width:100%; padding:.6rem .7rem; border:1px solid #d7dce5; border-radius:9px; font:inherit; }
    .pf-field textarea:focus, .pf-field input:focus, .pf-field select:focus { outline:2px solid var(--pf-accent); border-color:var(--pf-accent); }
    .pf-choices { display:flex; flex-direction:column; gap:.35rem; }
    .opt { display:flex; align-items:center; gap:.5rem; font-weight:400; padding:.35rem .5rem; border:1px solid #e5e9f0; border-radius:8px; cursor:pointer; }
    .opt input { width:auto; }
    .pf-scale { display:flex; align-items:center; gap:.4rem; flex-wrap:wrap; }
    .pf-scale .lbl { font-size:.78rem; color:#64748b; }
    .dot { width:38px; height:38px; border-radius:50%; border:1px solid #d7dce5; background:#fff; cursor:pointer; font-weight:600; }
    .dot.on { background:var(--pf-accent); color:#fff; border-color:var(--pf-accent); }
    .pf-stars { display:flex; gap:.15rem; }
    .star { font-size:1.9rem; line-height:1; color:#d7dce5; background:none; border:none; cursor:pointer; }
    .star.on { color:var(--pf-accent); }
    .pf-upload { display:flex; align-items:center; gap:.6rem; flex-wrap:wrap; } .fname { font-size:.82rem; color:#475569; }
    .pf-submit { margin:1rem 2rem 1.6rem; padding:.8rem 1.4rem; background:var(--pf-accent); color:#fff; border:none; border-radius:10px; font-weight:700; font-size:1rem; cursor:pointer; }
    .pf-submit:disabled { opacity:.6; }
    .pf-foot { text-align:center; padding:0 0 1.2rem; font-size:.78rem; }
    .closed { color:#b45309; font-weight:600; padding:0 2rem 1.4rem; }
    .err { color:#e11d48; padding:0 2rem; }
    .center { text-align:center; } .check { width:56px; height:56px; border-radius:50%; background:#16a34a; color:#fff; font-size:1.8rem; display:flex; align-items:center; justify-content:center; margin:0 auto 1rem; }
  `],
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

  logo = computed(() => this.form()?.logo_url || null);
  companyName = computed(() => this.form()?.company_name || null);
  showProgress = computed(() => this.form()?.show_progress !== false);
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
          this.successMessage.set(f.success_message);
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
