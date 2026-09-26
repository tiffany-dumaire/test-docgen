import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { AuthService } from '@core/auth/auth.service';
import { ToastService } from '@core/services/api.service';
import { ThemeService, Proposition, ThemeMode, FONT_CHOICES, VNV_BRAND }
  from '@core/services/theme.service';
import { LanguageService, Lang } from '@core/services/language.service';

@Component({
  selector: 'app-preferences',
  imports: [FormsModule, TranslocoModule],
  template: `
    <h1>{{ 'prefs.title' | transloco }}</h1>
    <p class="muted">{{ 'prefs.subtitle' | transloco }}</p>

    <div class="card stack" style="max-width:620px">
      <h3>{{ 'prefs.language' | transloco }}</h3>
      <p class="muted" style="margin:0">{{ 'prefs.language_hint' | transloco }}</p>
      <div class="langs">
        @for (l of lang.langs; track l.code) {
          <button class="langb" [class.active]="lang.active() === l.code" (click)="pickLang(l.code)">
            <span class="flag">{{ l.flag }}</span> {{ l.label }}
          </button>
        }
      </div>
    </div>

    <div class="card stack" style="max-width:620px">
      <h3>{{ 'prefs.base_theme' | transloco }}</h3>
      <p class="muted" style="margin:0">{{ 'prefs.base_theme_hint' | transloco }}</p>
      <div class="props">
        @for (p of theme.propositions; track p.id) {
          <button class="prop" [class.active]="proposition() === p.id" (click)="pickProp(p.id)">
            <span class="dot" [style.background]="p.primary"></span>
            <span class="pn">{{ p.name }}</span>
            <span class="ps">{{ p.sub }}</span>
          </button>
        }
      </div>
      <div class="row" style="gap:.5rem;align-items:center;margin-top:.3rem">
        <label style="margin:0">{{ 'prefs.brightness' | transloco }}</label>
        <div class="seg">
          @for (m of modes; track m.v) {
            <button class="segb" [class.active]="mode() === m.v" (click)="pickMode(m.v)">{{ m.l | transloco }}</button>
          }
        </div>
      </div>
    </div>

    <div class="card stack" style="max-width:620px">
      <h3>{{ 'prefs.primary' | transloco }}</h3>
      <p class="muted" style="margin:0">{{ 'prefs.primary_hint' | transloco }}</p>
      <div class="swatches">
        @for (c of presets; track c) {
          <button class="sw" [style.background]="c" [class.active]="accent() === c" (click)="pick(c)" [title]="c"></button>
        }
      </div>
      <div class="row" style="gap:.8rem;align-items:center;margin-top:.6rem">
        <label style="margin:0">{{ 'prefs.custom' | transloco }}</label>
        <input type="color" [ngModel]="accent() || vnvPrimary" (ngModelChange)="pick($event)" style="width:56px;height:38px;padding:2px" />
        <button class="btn btn-ghost btn-sm" (click)="resetColor()">{{ 'prefs.theme_color' | transloco }}</button>
      </div>
    </div>

    <div class="card stack" style="max-width:620px">
      <h3>{{ 'prefs.typography' | transloco }}</h3>
      <p class="muted" style="margin:0">{{ 'prefs.typo_hint' | transloco }}</p>
      <div class="form-grid">
        <div class="field">
          <label>{{ 'prefs.title_font' | transloco }}</label>
          <select [ngModel]="fontTitle()" (ngModelChange)="pickFont('title', $event)">
            <option value="">{{ 'prefs.theme_font' | transloco }}</option>
            @for (f of fonts; track f.value) { <option [value]="f.value">{{ f.label }}</option> }
          </select>
        </div>
        <div class="field">
          <label>{{ 'prefs.body_font' | transloco }}</label>
          <select [ngModel]="fontBody()" (ngModelChange)="pickFont('body', $event)">
            <option value="">{{ 'prefs.theme_font' | transloco }}</option>
            @for (f of fonts; track f.value) { <option [value]="f.value">{{ f.label }}</option> }
          </select>
        </div>
      </div>
      <button class="btn btn-ghost btn-sm" (click)="resetFonts()" style="align-self:flex-start">{{ 'prefs.theme_fonts' | transloco }}</button>
    </div>

    <div class="card stack" style="max-width:620px">
      <h3>{{ 'prefs.preview' | transloco }}</h3>
      <div class="preview">
        <div style="font-family:var(--pd-display);font-weight:700;font-size:1.3rem">{{ 'prefs.sample_title' | transloco }}</div>
        <p style="font-family:var(--pd-body);margin:.2rem 0">{{ 'prefs.sample_body' | transloco }}</p>
        <div class="row" style="gap:1rem;align-items:center">
          <span class="btn btn-primary">{{ 'prefs.sample_button' | transloco }}</span>
          <span class="badge badge-internal">{{ 'prefs.sample_badge' | transloco }}</span>
          <a href="javascript:void(0)">{{ 'prefs.sample_link' | transloco }}</a>
        </div>
      </div>
      <div class="row" style="justify-content:space-between">
        <button class="btn btn-ghost" (click)="resetAll()">{{ 'prefs.reset_all' | transloco }}</button>
        <button class="btn btn-primary" (click)="save()" [disabled]="saving()">
          {{ (saving() ? 'prefs.saving' : 'prefs.save') | transloco }}
        </button>
      </div>
    </div>
  `,
  styles: [`
    .swatches { display:flex; flex-wrap:wrap; gap:.5rem; }
    .sw { width:38px; height:38px; border-radius:50%; border:2px solid #fff; cursor:pointer;
      box-shadow: 0 0 0 1px var(--border); }
    .sw.active { box-shadow: 0 0 0 3px var(--primary); }
    .preview { display:flex; flex-direction:column; gap:.4rem; padding:1rem; border:1px dashed var(--border); border-radius:12px; margin:.4rem 0; }
    .props { display:grid; grid-template-columns:repeat(4,1fr); gap:.6rem; }
    @media(max-width:560px){ .props { grid-template-columns:repeat(2,1fr); } }
    .prop { display:flex; flex-direction:column; align-items:flex-start; gap:.15rem; border:1px solid var(--border);
      border-radius:12px; padding:.7rem .8rem; cursor:pointer; background:var(--surface,#fff); text-align:left; }
    .prop:hover { border-color:var(--primary); }
    .prop.active { border-color:var(--primary); box-shadow:0 0 0 2px var(--primary); }
    .prop .dot { width:26px; height:26px; border-radius:50%; box-shadow:0 0 0 1px var(--border); margin-bottom:.25rem; }
    .prop .pn { font-weight:700; font-size:.9rem; }
    .prop .ps { font-size:.76rem; color:var(--muted); }
    .seg { display:inline-flex; border:1px solid var(--border); border-radius:9px; overflow:hidden; }
    .segb { border:0; background:transparent; padding:.4rem .8rem; cursor:pointer; font-weight:600; font-size:.84rem; color:var(--fg,inherit); }
    .segb.active { background:var(--primary); color:#fff; }
    .langs { display:flex; flex-wrap:wrap; gap:.5rem; }
    .langb { display:inline-flex; align-items:center; gap:.4rem; border:1px solid var(--border); background:var(--surface,#fff);
      border-radius:10px; padding:.45rem .8rem; cursor:pointer; font-weight:600; font-size:.86rem; color:var(--text,inherit); }
    .langb:hover { border-color:var(--primary); }
    .langb.active { border-color:var(--primary); box-shadow:0 0 0 2px var(--primary); }
    .langb .flag { font-size:1.1rem; }
  `],
})
export class Preferences {
  private auth = inject(AuthService);
  private toast = inject(ToastService);
  private t = inject(TranslocoService);
  theme = inject(ThemeService);
  lang = inject(LanguageService);
  fonts = FONT_CHOICES;
  vnvPrimary = VNV_BRAND.primary;
  presets = ['#ec6608', '#1D5F8C', '#2563eb', '#0ea5e9', '#0d9488', '#16a34a', '#d97706', '#dc2626', '#db2777', '#7c3aed', '#1d1e1b'];

  private prefs = () => this.auth.user()?.ui_prefs || {};
  accent = signal<string>((this.prefs()['accent'] as string) || '');
  fontTitle = signal<string>((this.prefs()['font_title'] as string) || '');
  fontBody = signal<string>((this.prefs()['font_body'] as string) || '');
  saving = signal(false);

  proposition = this.theme.proposition;
  mode = this.theme.mode;
  modes: { v: ThemeMode; l: string }[] = [
    { v: 'light', l: 'theme.light' }, { v: 'dark', l: 'theme.dark' }, { v: 'auto', l: 'theme.auto' },
  ];

  pickLang(code: Lang) {
    this.lang.set(code);
    this.auth.updatePrefs({ lang: code }).catch(() => { /* appliqué localement */ });
  }

  pickProp(p: Proposition) {
    this.theme.setProposition(p);
    this.auth.updatePrefs({ theme_proposition: p }).catch(() => { /* appliqué localement */ });
  }
  pickMode(m: ThemeMode) {
    this.theme.setMode(m);
    this.auth.updatePrefs({ theme_mode: m }).catch(() => { /* silencieux */ });
  }

  pick(c: string) { this.accent.set(c); this.theme.applyAccent(c); }
  resetColor() { this.accent.set(''); this.theme.applyAccent(''); }

  pickFont(which: 'title' | 'body', value: string) {
    if (which === 'title') this.fontTitle.set(value); else this.fontBody.set(value);
    this.theme.applyFonts(this.fontTitle(), this.fontBody());
  }
  resetFonts() { this.fontTitle.set(''); this.fontBody.set(''); this.theme.applyFonts('', ''); }

  resetAll() {
    this.resetColor(); this.resetFonts();
    this.theme.setProposition('vnv'); this.theme.setMode('auto');
    this.auth.updatePrefs({ theme_proposition: 'vnv', theme_mode: 'auto' }).catch(() => {});
  }

  async save() {
    this.saving.set(true);
    try {
      await this.auth.updatePrefs({
        accent: this.accent() || null,
        font_title: this.fontTitle() || null,
        font_body: this.fontBody() || null,
      });
      this.toast.success(this.t.translate('prefs.saved'));
    } catch { this.toast.error(this.t.translate('prefs.save_error')); }
    finally { this.saving.set(false); }
  }
}
