import { Injectable, signal } from '@angular/core';

export type Proposition = 'bise' | 'noire' | 'joran';
export type ThemeMode = 'light' | 'dark' | 'auto';

export interface PropositionDef {
  id: Proposition; name: string; sub: string; primary: string; font: string;
}

/** Les trois « vents » du système de thème Polydocs. */
export const PROPOSITIONS: PropositionDef[] = [
  { id: 'bise', name: 'Bise', sub: 'Givre', primary: '#1D5F8C', font: '"Bricolage Grotesque", sans-serif' },
  { id: 'noire', name: 'Bise Noire', sub: 'Acier', primary: '#34546A', font: '"Red Hat Display", sans-serif' },
  { id: 'joran', name: 'Joran', sub: 'Nuit polaire', primary: '#3F51A3', font: '"Young Serif", serif' },
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
    let p = 'bise', m = 'auto';
    try { p = localStorage.getItem(P_KEY) || 'bise'; m = localStorage.getItem(M_KEY) || 'auto'; } catch { /* noop */ }
    if (!['bise', 'noire', 'joran'].includes(p)) p = 'bise';
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
    if (p === 'bise') root.removeAttribute('data-p'); else root.setAttribute('data-p', p);
    const m = this.mode();
    if (m === 'auto') root.removeAttribute('data-theme'); else root.setAttribute('data-theme', m);
    root.classList.toggle('dark', this.resolvedDark());
  }
}
