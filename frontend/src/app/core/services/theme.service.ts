import { Injectable, signal } from '@angular/core';

export type Proposition = 'vnv' | 'bise' | 'noire' | 'joran';
export type ThemeMode = 'light' | 'dark' | 'auto';

export interface PropositionDef {
  id: Proposition; name: string; sub: string; primary: string; font: string;
}

/**
 * Thèmes de base. « VNV » (défaut) reprend la charte du document
 * Corporate Identity : orange #ec6608, gris charcoal, typographie Montserrat.
 */
export const PROPOSITIONS: PropositionDef[] = [
  { id: 'vnv', name: 'VNV', sub: 'Charte entreprise', primary: '#ec6608', font: '"Montserrat", sans-serif' },
  { id: 'bise', name: 'Bise', sub: 'Givre', primary: '#1D5F8C', font: '"Bricolage Grotesque", sans-serif' },
  { id: 'noire', name: 'Bise Noire', sub: 'Acier', primary: '#34546A', font: '"Red Hat Display", sans-serif' },
  { id: 'joran', name: 'Joran', sub: 'Nuit polaire', primary: '#3F51A3', font: '"Young Serif", serif' },
];
export const PROPOSITION_IDS: Proposition[] = ['vnv', 'bise', 'noire', 'joran'];
export const DEFAULT_PROPOSITION: Proposition = 'vnv';

/** Valeurs par défaut issues de la charte VNV (Corporate Identity). */
export const VNV_BRAND = {
  primary: '#ec6608',   // Orange VNV
  text: '#1d1e1b',      // Charcoal Black
  fontTitle: '"Montserrat", "Segoe UI", system-ui, sans-serif',
  fontBody: '"Montserrat", "Segoe UI", system-ui, sans-serif',
};

/** Polices proposées dans les préférences (typographie configurable). */
export const FONT_CHOICES: { label: string; value: string }[] = [
  { label: 'Montserrat (charte VNV)', value: '"Montserrat", "Segoe UI", system-ui, sans-serif' },
  { label: 'Oswald (condensé)', value: '"Oswald", "Segoe UI", system-ui, sans-serif' },
  { label: 'Figtree', value: '"Figtree", "Segoe UI", system-ui, sans-serif' },
  { label: 'Bricolage Grotesque', value: '"Bricolage Grotesque", system-ui, sans-serif' },
  { label: 'Red Hat Display', value: '"Red Hat Display", system-ui, sans-serif' },
  { label: 'Onest', value: '"Onest", system-ui, sans-serif' },
  { label: 'Young Serif', value: '"Young Serif", serif' },
];

const P_KEY = 'pd-proposal';
const M_KEY = 'pd-mode';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  proposition = signal<Proposition>('bise');
  mode = signal<ThemeMode>('auto');
  propositions = PROPOSITIONS;
  private mq?: MediaQueryList;

  /** À appeler au démarrage de l'application. */
  init() {
    let p: string = DEFAULT_PROPOSITION, m = 'auto';
    try {
      p = localStorage.getItem(P_KEY) || DEFAULT_PROPOSITION;
      m = localStorage.getItem(M_KEY) || 'auto';
    } catch { /* noop */ }
    if (!PROPOSITION_IDS.includes(p as Proposition)) p = DEFAULT_PROPOSITION;
    if (!['light', 'dark', 'auto'].includes(m)) m = 'auto';
    this.proposition.set(p as Proposition);
    this.mode.set(m as ThemeMode);
    if (typeof window !== 'undefined' && window.matchMedia) {
      this.mq = window.matchMedia('(prefers-color-scheme: dark)');
      this.mq.addEventListener('change', () => this.apply());
    }
    this.apply();
  }

  setProposition(p: Proposition) {
    this.proposition.set(p);
    try { localStorage.setItem(P_KEY, p); } catch { /* noop */ }
    this.apply();
  }
  setMode(m: ThemeMode) {
    this.mode.set(m);
    try { localStorage.setItem(M_KEY, m); } catch { /* noop */ }
    this.apply();
  }
  toggleDark() { this.setMode(this.resolvedDark() ? 'light' : 'dark'); }

  resolvedDark(): boolean {
    const m = this.mode();
    if (m === 'dark') return true;
    if (m === 'light') return false;
    return !!(typeof window !== 'undefined' && window.matchMedia &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);
  }

  private apply() {
    const root = document.documentElement;
    const p = this.proposition();
    // « bise » = jeu de jetons de base (:root sans data-p) ; les autres ont un bloc dédié.
    if (p === 'bise') root.removeAttribute('data-p'); else root.setAttribute('data-p', p);
    const m = this.mode();
    if (m === 'auto') root.removeAttribute('data-theme'); else root.setAttribute('data-theme', m);
    root.classList.toggle('dark', this.resolvedDark());
  }

  // --- Personnalisation fine (couleur + typographie), point 4 ---------------
  private hexToRgb(h: string) {
    h = h.replace('#', ''); if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16) };
  }
  private shade(hex: string, amt: number) {
    const { r, g, b } = this.hexToRgb(hex);
    const f = (v: number) => Math.max(0, Math.min(255, Math.round(v + (amt < 0 ? v * amt : (255 - v) * amt))));
    return `#${[f(r), f(g), f(b)].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
  }
  private mix(hex: string, other: string, ratio: number) {
    const a = this.hexToRgb(hex), b = this.hexToRgb(other);
    const m = (x: number, y: number) => Math.round(x * (1 - ratio) + y * ratio);
    return `#${[m(a.r, b.r), m(a.g, b.g), m(a.b, b.b)].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
  }
  private rgba(hex: string, alpha: number) {
    const { r, g, b } = this.hexToRgb(hex); return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  /** Applique une couleur primaire personnalisée (vide = revient au thème de base). */
  applyAccent(accent: string) {
    const root = document.documentElement;
    const keys = ['--primary', '--primary-dark', '--primary-light', '--primary-050', '--ring', '--brand'];
    if (!accent) { keys.forEach((k) => root.style.removeProperty(k)); root.removeAttribute('data-brand'); return; }
    root.setAttribute('data-brand', '');
    root.style.setProperty('--brand', accent);
    root.style.setProperty('--primary', accent);
    root.style.setProperty('--primary-dark', this.shade(accent, -0.16));
    root.style.setProperty('--primary-light', this.mix(accent, '#ffffff', 0.82));
    root.style.setProperty('--primary-050', this.mix(accent, '#ffffff', 0.92));
    root.style.setProperty('--ring', `0 0 0 3px ${this.rgba(accent, 0.22)}`);
  }

  /** Applique les polices de titre / corps (vide = valeurs du thème de base). */
  applyFonts(fontTitle: string, fontBody: string) {
    const root = document.documentElement;
    fontTitle ? root.style.setProperty('--pd-display', fontTitle) : root.style.removeProperty('--pd-display');
    fontBody ? root.style.setProperty('--pd-body', fontBody) : root.style.removeProperty('--pd-body');
  }
}
