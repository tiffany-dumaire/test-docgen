import { Component, Input, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FormContent, FormField, FormSection, FormTheme } from '../../core/models';

/**
 * Aperçu (lecture) d'un formulaire tel que vu par le répondant : logo, thème,
 * sections, tous les types de questions, barre de progression. Purement visuel
 * (aucune soumission). Réutilisé par les éditeurs de formulaire et de modèle.
 */
@Component({
  selector: 'app-form-preview',
  imports: [FormsModule],
  template: `
    <div class="pf-wrap" [style.background]="bg()" [style.--pf-accent]="accent()">
      <div class="pf-doc" [class.plain]="layout()==='plain'">
        @if (layout()==='cover' && theme?.cover_image) {
          <div class="pf-cover" [style.background-image]="'url(' + theme!.cover_image + ')'">
            <div class="pf-cover-veil">
              @if (logoUrl) { <img class="pf-logo lg" [src]="logoUrl" alt="logo" /> }
              <h1>{{ title || 'Titre du formulaire' }}</h1>
            </div>
          </div>
        } @else {
          <div class="pf-header">
            @if (logoUrl) { <img class="pf-logo" [src]="logoUrl" alt="logo" /> }
            <h1>{{ title || 'Titre du formulaire' }}</h1>
          </div>
        }

        @if (description) { <p class="pf-desc">{{ description }}</p> }

        @if (showProgress) {
          <div class="pf-progress"><div class="bar" [style.width.%]="progress()"></div></div>
          <div class="pf-progress-label muted">{{ answered() }} / {{ total() }} répondu(s)</div>
        }

        @for (sec of sections; track sec.id) {
          <section class="pf-section">
            @if (sec.title) { <h2>{{ sec.title }}</h2> }
            @if (sec.description) { <p class="pf-sec-desc">{{ sec.description }}</p> }
            @for (el of sec.elements; track $index) {
              @if (isContent(el)) {
                <div class="pf-content">
                  @if (asC(el).title) { <h3>{{ asC(el).title }}</h3> }
                  @switch (asC(el).content_type) {
                    @case ('image') { @if (asC(el).url) { <img class="pf-cimg" [src]="asC(el).url" alt="" /> } }
                    @case ('file') { @if (asC(el).url) { <a class="pf-file" [href]="asC(el).url" target="_blank" rel="noopener">📎 {{ asC(el).name || 'Fichier' }}</a> } }
                    @default { @if (asC(el).text) { <p class="pf-ctext">{{ asC(el).text }}</p> } }
                  }
                </div>
              } @else {
                <div class="pf-field">
                  <label class="pf-q">{{ asQ(el).label || 'Question' }} @if (asQ(el).required) { <span class="req">*</span> }</label>
                  @if (asQ(el).hint) { <div class="pf-hint">{{ asQ(el).hint }}</div> }
                  @if (asQ(el).image) { <img class="pf-qimg" [src]="asQ(el).image" alt="" /> }
                  @if (asQ(el).template_file) { <a class="pf-file sm" [href]="asQ(el).template_file" target="_blank" rel="noopener">📎 Fichier modèle : {{ asQ(el).template_file_name || 'télécharger' }}</a> }

                  @switch (asQ(el).type) {
                    @case ('textarea') { <textarea rows="3" [ngModel]="val(asQ(el).key)" (ngModelChange)="set(asQ(el).key,$event)"></textarea> }
                    @case ('select') {
                      <select [ngModel]="val(asQ(el).key)" (ngModelChange)="set(asQ(el).key,$event)">
                        <option value="">—</option>
                        @for (o of asQ(el).options ?? []; track o) { <option [value]="o">{{ o }}</option> }
                      </select>
                    }
                    @case ('radio') {
                      <div class="pf-choices">
                        @for (o of asQ(el).options ?? []; track o) {
                          <label class="opt"><input type="radio" [name]="asQ(el).key" [value]="o" [ngModel]="val(asQ(el).key)" (ngModelChange)="set(asQ(el).key,$event)" /> <span>{{ o }}</span></label>
                        }
                      </div>
                    }
                    @case ('checkboxes') {
                      <div class="pf-choices">
                        @for (o of asQ(el).options ?? []; track o) {
                          <label class="opt"><input type="checkbox" [checked]="checked(asQ(el).key,o)" (change)="toggle(asQ(el).key,o)" /> <span>{{ o }}</span></label>
                        }
                      </div>
                    }
                    @case ('checkbox') { <label class="opt"><input type="checkbox" [ngModel]="val(asQ(el).key)===true" (ngModelChange)="set(asQ(el).key,$event)" /> <span>Oui</span></label> }
                    @case ('scale') {
                      <div class="pf-scale">
                        <span class="lbl">{{ asQ(el).scale_min_label }}</span>
                        @for (n of scaleRange(asQ(el)); track n) { <button type="button" class="dot" [class.on]="val(asQ(el).key)===n" (click)="set(asQ(el).key,n)">{{ n }}</button> }
                        <span class="lbl">{{ asQ(el).scale_max_label }}</span>
                      </div>
                    }
                    @case ('rating') {
                      <div class="pf-stars">
                        @for (n of starRange(asQ(el)); track n) { <button type="button" class="star" [class.on]="(val(asQ(el).key)||0)>=n" (click)="set(asQ(el).key,n)">★</button> }
                      </div>
                    }
                    @case ('slot') {
                      @if ((asQ(el).slots ?? []).length) {
                        <div class="pf-choices">
                          @for (o of asQ(el).slots ?? []; track o) { <label class="opt"><input type="radio" [name]="asQ(el).key" [value]="o" [ngModel]="val(asQ(el).key)" (ngModelChange)="set(asQ(el).key,$event)" /> <span>{{ o }}</span></label> }
                        </div>
                      } @else { <input type="datetime-local" [ngModel]="val(asQ(el).key)" (ngModelChange)="set(asQ(el).key,$event)" /> }
                    }
                    @case ('file') { <input type="file" disabled /> }
                    @default { <input [type]="inputType(asQ(el).type)" [ngModel]="val(asQ(el).key)" (ngModelChange)="set(asQ(el).key,$event)" /> }
                  }
                </div>
              }
            }
          </section>
        }
        @if (!sections.length) { <div class="pf-section muted">Ajoutez des sections et des questions pour voir l'aperçu.</div> }

        <button class="pf-submit" type="button" disabled>{{ theme?.button_label || 'Envoyer' }}</button>
        <div class="pf-foot muted">{{ companyName || 'PolyDocs' }}</div>
      </div>
    </div>
  `,
  styles: [`
    :host { display:block; --pf-accent:#ec6608; }
    .pf-wrap { display:flex; justify-content:center; padding:1.5rem 1rem; }
    .pf-doc { background:#fff; border-radius:18px; box-shadow:0 16px 48px rgba(15,23,42,.16); width:100%; max-width:640px; overflow:hidden; }
    .pf-doc.plain { box-shadow:none; }
    .pf-header { display:flex; align-items:center; gap:1rem; padding:1.4rem 1.6rem .3rem; border-top:6px solid var(--pf-accent); }
    .pf-logo { height:38px; } .pf-logo.lg { height:52px; }
    .pf-header h1 { margin:0; font-size:1.4rem; }
    .pf-cover { min-height:160px; background-size:cover; background-position:center; display:flex; align-items:flex-end; }
    .pf-cover-veil { width:100%; background:linear-gradient(transparent, rgba(0,0,0,.6)); color:#fff; padding:1.2rem 1.6rem; }
    .pf-cover-veil h1 { margin:.3rem 0 0; font-size:1.5rem; }
    .pf-desc { padding:0 1.6rem; color:#475569; }
    .pf-progress { height:8px; background:#e9edf3; border-radius:99px; margin:.9rem 1.6rem .2rem; overflow:hidden; }
    .pf-progress .bar { height:100%; background:var(--pf-accent); transition:width .25s; }
    .pf-progress-label { padding:0 1.6rem; font-size:.74rem; }
    .pf-section { padding:.9rem 1.6rem; border-top:1px solid #eef1f6; margin-top:.5rem; }
    .pf-section h2 { font-size:1.1rem; margin:.2rem 0; color:var(--pf-accent); }
    .pf-sec-desc { color:#64748b; margin:.1rem 0 .7rem; font-size:.88rem; }
    .pf-content { background:#f7f9fc; border-radius:10px; padding:.6rem .8rem; margin:.5rem 0; }
    .pf-content h3 { margin:.1rem 0 .3rem; font-size:.98rem; }
    .pf-cimg { max-width:100%; border-radius:8px; } .pf-ctext { margin:.2rem 0; color:#334155; white-space:pre-line; }
    .pf-file { display:inline-block; color:var(--pf-accent); font-weight:600; text-decoration:none; } .pf-file.sm { font-size:.82rem; }
    .pf-field { margin:.8rem 0; display:flex; flex-direction:column; gap:.3rem; }
    .pf-q { font-weight:600; } .req { color:#e11d48; } .pf-hint { font-size:.82rem; color:#64748b; }
    .pf-qimg { max-width:100%; border-radius:8px; margin:.2rem 0; }
    .pf-field input:not([type=radio]):not([type=checkbox]):not([type=file]), .pf-field textarea, .pf-field select { width:100%; padding:.55rem .7rem; border:1px solid #d7dce5; border-radius:9px; font:inherit; box-sizing:border-box; }
    .pf-choices { display:flex; flex-direction:column; gap:.3rem; }
    .opt { display:flex; align-items:center; gap:.5rem; font-weight:400; padding:.3rem .5rem; border:1px solid #e5e9f0; border-radius:8px; }
    .opt input { width:auto; }
    .pf-scale { display:flex; align-items:center; gap:.4rem; flex-wrap:wrap; } .pf-scale .lbl { font-size:.76rem; color:#64748b; }
    .dot { width:36px; height:36px; border-radius:50%; border:1px solid #d7dce5; background:#fff; cursor:pointer; font-weight:600; }
    .dot.on { background:var(--pf-accent); color:#fff; border-color:var(--pf-accent); }
    .pf-stars { display:flex; gap:.15rem; } .star { font-size:1.8rem; color:#d7dce5; background:none; border:none; cursor:pointer; } .star.on { color:var(--pf-accent); }
    .pf-submit { margin:1rem 1.6rem 1.4rem; padding:.75rem 1.3rem; background:var(--pf-accent); color:#fff; border:none; border-radius:10px; font-weight:700; font-size:1rem; opacity:.9; }
    .pf-foot { text-align:center; padding:0 0 1rem; font-size:.76rem; }
  `],
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
