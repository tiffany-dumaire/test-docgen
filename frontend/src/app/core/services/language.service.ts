import { inject, Injectable, signal } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';

export type Lang = 'fr' | 'en' | 'de' | 'it';

export interface LangDef { code: Lang; label: string; flag: string; }

export const LANGS: LangDef[] = [
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
  { code: 'it', label: 'Italiano', flag: '🇮🇹' },
];

const LANG_KEY = 'docugen_lang';

/** Gère la langue active de l'interface (Transloco) + persistance locale. */
@Injectable({ providedIn: 'root' })
export class LanguageService {
  private transloco = inject(TranslocoService);
  langs = LANGS;
  active = signal<Lang>('fr');

  /** À appeler tôt (avant/à l'amorçage) : applique la langue stockée localement. */
  init() {
    let stored: string | null = null;
    try { stored = localStorage.getItem(LANG_KEY); } catch { /* noop */ }
    const lang = this.normalize(stored) || this.normalize(this.transloco.getActiveLang()) || 'fr';
    this.set(lang, false);
  }

  private normalize(v: string | null | undefined): Lang | null {
    return LANGS.some((l) => l.code === v) ? (v as Lang) : null;
  }

  /** Change la langue active (et la mémorise localement). */
  set(lang: Lang, persist = true) {
    this.active.set(lang);
    this.transloco.setActiveLang(lang);
    if (persist) { try { localStorage.setItem(LANG_KEY, lang); } catch { /* noop */ } }
  }

  current(): Lang { return this.active(); }
}
