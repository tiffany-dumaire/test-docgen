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
  templateUrl: './preferences.html',
  styleUrl: './preferences.scss',
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
