import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ApiConfig } from '@core/services/api.service';
import { AuthConfig, AuthUser } from '@core/models';
import { ThemeService, Proposition, ThemeMode, PROPOSITION_IDS } from '@core/services/theme.service';

const TOKEN_KEY = 'docugen_token';
const STATE_KEY = 'docugen_pkce_state';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private cfg = inject(ApiConfig);
  private theme = inject(ThemeService);
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

  // --- Connexion OIDC (Authorization Code + PKCE) orchestrée par Django ---
  // Le code_verifier reste côté serveur ; le frontend ne manipule que le state.
  async login(): Promise<void> {
    const start = await firstValueFrom(
      this.http.post<{ authorize_url: string; state: string }>(`${this.base}/auth/login/`, {}));
    try { localStorage.setItem(STATE_KEY, start.state); } catch { /* noop */ }
    window.location.href = start.authorize_url;
  }

  async handleCallback(code: string): Promise<void> {
    let state = '';
    try {
      state = new URLSearchParams(window.location.search).get('state')
        || localStorage.getItem(STATE_KEY) || '';
    } catch { /* noop */ }
    // Django échange le code contre un jeton et renvoie le token « avec informations ».
    const r = await firstValueFrom(this.http.post<{ access_token: string; user?: AuthUser }>(
      `${this.base}/auth/callback/`, { code, state }));
    this.setToken(r.access_token);
    try { localStorage.removeItem(STATE_KEY); } catch { /* noop */ }
    if (r.user) { this.user.set(r.user); this.applyTheme(); } else { await this.loadMe(); }
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
    const prefs = this.user()?.ui_prefs || {};
    // Thème de base synchronisé depuis le profil (multi-appareils).
    const prop = prefs["theme_proposition"] as Proposition | undefined;
    if (prop && PROPOSITION_IDS.includes(prop)) this.theme.setProposition(prop);
    const mode = prefs["theme_mode"] as ThemeMode | undefined;
    if (mode && ["light", "dark", "auto"].includes(mode)) this.theme.setMode(mode);
    // Couleur primaire et typographie personnalisées (point 4).
    this.theme.applyAccent((prefs["accent"] as string) || "");
    this.theme.applyFonts(
      (prefs["font_title"] as string) || "",
      (prefs["font_body"] as string) || "");
  }

  isDark(): boolean { return document.documentElement.classList.contains("dark"); }
}
