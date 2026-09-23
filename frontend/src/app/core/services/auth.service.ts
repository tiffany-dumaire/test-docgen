import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ApiConfig } from './api.service';
import { AuthConfig, AuthUser } from '../models';

const TOKEN_KEY = 'docugen_token';
const VERIFIER_KEY = 'docugen_pkce_verifier';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private cfg = inject(ApiConfig);
  private base = this.cfg.base;

  config = signal<AuthConfig | null>(null);
  user = signal<AuthUser | null>(null);
  ready = signal(false);
  isAuthenticated = computed(() => !!this.user());
  isDev = computed(() => this.config()?.mode === 'dev');

  get token(): string | null {
    try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
  }
  private setToken(t: string | null) {
    try { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY); } catch { /* noop */ }
  }

  /** Appelé au démarrage (APP_INITIALIZER). */
  async init(): Promise<void> {
    try {
      const conf = await firstValueFrom(this.http.get<AuthConfig>(`${this.base}/auth/config/`));
      this.config.set(conf);
    } catch { /* config indisponible */ }
    if (this.token) {
      try { await this.loadMe(); } catch { this.setToken(null); this.user.set(null); }
    }
    this.ready.set(true);
  }

  async loadMe(): Promise<void> {
    const me = await firstValueFrom(this.http.get<AuthUser>(`${this.base}/auth/me/`));
    this.user.set(me);
    this.applyTheme();
  }

  hasRole(role: string): boolean { return (this.user()?.app_roles ?? []).includes(role); }

  // --- Connexion développement (jeton HS256 émis par le backend) ---
  async devLogin(payload: { email: string; first_name?: string; last_name?: string; roles?: string[] }): Promise<void> {
    const r = await firstValueFrom(
      this.http.post<{ access_token: string }>(`${this.base}/auth/dev-token/`, payload));
    this.setToken(r.access_token);
    await this.loadMe();
  }

  // --- Connexion OIDC (Authorization Code + PKCE) ---
  async login(): Promise<void> {
    const c = this.config();
    if (!c || !c.authorize_url) throw new Error('OIDC non configuré');
    const verifier = this.randomString(64);
    const challenge = await this.sha256Base64Url(verifier);
    try { localStorage.setItem(VERIFIER_KEY, verifier); } catch { /* noop */ }
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: c.client_id,
      redirect_uri: c.redirect_uri,
      scope: c.scopes,
      code_challenge: challenge,
      code_challenge_method: 'S256',
      state: this.randomString(16),
    });
    window.location.href = `${c.authorize_url}?${params.toString()}`;
  }

  async handleCallback(code: string): Promise<void> {
    const c = this.config();
    if (!c) throw new Error('Config manquante');
    const verifier = (() => { try { return localStorage.getItem(VERIFIER_KEY) || ''; } catch { return ''; } })();
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: c.redirect_uri,
      client_id: c.client_id,
      code_verifier: verifier,
    });
    const r = await firstValueFrom(this.http.post<{ access_token: string }>(
      c.token_url, body.toString(),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }));
    this.setToken(r.access_token);
    try { localStorage.removeItem(VERIFIER_KEY); } catch { /* noop */ }
    await this.loadMe();
  }

  logout(): void {
    const c = this.config();
    this.setToken(null); this.user.set(null);
    if (c && c.mode === 'oidc' && c.end_session_url) {
      const p = new URLSearchParams({ post_logout_redirect_uri: c.post_logout_redirect_uri || '' });
      window.location.href = `${c.end_session_url}?${p.toString()}`;
    }
  }

  async updatePrefs(prefs: Record<string, unknown>): Promise<void> {
    const me = await firstValueFrom(
      this.http.patch<AuthUser>(`${this.base}/auth/prefs/`, prefs));
    this.user.set(me);
    this.applyTheme();
  }

  applyTheme(): void {
    const accent = (this.user()?.ui_prefs?.["accent"] as string) || "";
    const root = document.documentElement;
    const keys = ["--primary", "--primary-dark", "--primary-light", "--primary-050", "--ring"];
    if (!accent) { keys.forEach((k) => root.style.removeProperty(k)); return; }
    root.style.setProperty("--primary", accent);
    root.style.setProperty("--primary-dark", this.shade(accent, -0.16));
    root.style.setProperty("--primary-light", this.mix(accent, "#ffffff", 0.82));
    root.style.setProperty("--primary-050", this.mix(accent, "#ffffff", 0.92));
    root.style.setProperty("--ring", `0 0 0 3px ${this.rgba(accent, 0.22)}`);
  }
  private hexToRgb(h: string) {
    h = h.replace("#", ""); if (h.length === 3) h = h.split("").map((c) => c + c).join("");
    return { r: parseInt(h.slice(0,2),16), g: parseInt(h.slice(2,4),16), b: parseInt(h.slice(4,6),16) };
  }
  private shade(hex: string, amt: number) {
    const { r, g, b } = this.hexToRgb(hex);
    const f = (v: number) => Math.max(0, Math.min(255, Math.round(v + (amt < 0 ? v * amt : (255 - v) * amt))));
    return `#${[f(r),f(g),f(b)].map((v)=>v.toString(16).padStart(2,"0")).join("")}`;
  }
  private mix(hex: string, other: string, ratio: number) {
    const a = this.hexToRgb(hex), b = this.hexToRgb(other);
    const m = (x: number, y: number) => Math.round(x * (1 - ratio) + y * ratio);
    return `#${[m(a.r,b.r),m(a.g,b.g),m(a.b,b.b)].map((v)=>v.toString(16).padStart(2,"0")).join("")}`;
  }
  private rgba(hex: string, alpha: number) {
    const { r, g, b } = this.hexToRgb(hex); return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  // --- PKCE helpers ---
  private randomString(len: number): string {
    const arr = new Uint8Array(len);
    crypto.getRandomValues(arr);
    return Array.from(arr, (b) => ('0' + (b & 0xff).toString(16)).slice(-2)).join('').slice(0, len);
  }
  private async sha256Base64Url(input: string): Promise<string> {
    const data = new TextEncoder().encode(input);
    const digest = await crypto.subtle.digest('SHA-256', data);
    let str = '';
    const bytes = new Uint8Array(digest);
    for (const b of bytes) str += String.fromCharCode(b);
    return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
}
