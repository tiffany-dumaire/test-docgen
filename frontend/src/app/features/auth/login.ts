import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/api.service';

@Component({
  selector: 'app-login',
  imports: [FormsModule, TranslocoModule],
  template: `
    <div class="auth-wrap">
      <div class="auth-card card">
        <div class="brand"><span class="logo"><img src="/images/logo/polydocs-6b.svg" alt="PolyDocs" /></span><div><b>PolyDocs</b><div class="tag">{{ 'login.tagline' | transloco }}</div></div></div>
        <h2>{{ 'login.title' | transloco }}</h2>

        @if (auth.isDev()) {
          <p class="muted">{{ 'login.dev_hint' | transloco }}</p>
          <div class="field"><label>{{ 'login.email' | transloco }}</label><input [(ngModel)]="email" /></div>
          <div class="form-grid">
            <div class="field"><label>{{ 'login.first_name' | transloco }}</label><input [(ngModel)]="firstName" /></div>
            <div class="field"><label>{{ 'login.last_name' | transloco }}</label><input [(ngModel)]="lastName" /></div>
          </div>
          <div class="field"><label>{{ 'login.roles' | transloco }}</label>
            <input [(ngModel)]="roles" [placeholder]="'login.roles_ph' | transloco" /></div>
          <button class="btn btn-primary" style="width:100%" (click)="devLogin()" [disabled]="loading()">
            {{ (loading() ? 'login.signing_in' : 'login.sign_in') | transloco }}
          </button>
        } @else {
          <p class="muted">{{ 'login.oidc_hint' | transloco }}</p>
          <button class="btn btn-primary" style="width:100%" (click)="oidcLogin()">{{ 'login.sign_in' | transloco }}</button>
        }
      </div>
    </div>
  `,
  styles: [`
    .auth-wrap { min-height: 100vh; display: grid; place-items: center; padding: 1.5rem;
      background: radial-gradient(1000px 500px at 50% -10%, #e0e7ff, transparent), var(--bg); }
    .auth-card { width: 100%; max-width: 420px; }
    .brand { display: flex; gap: .7rem; align-items: center; margin-bottom: 1rem; }
    .brand .logo { width: 42px; height: 42px; display: grid; place-items: center; }
    .brand .logo img { width: 100%; height: 100%; display: block; }
    .brand b { font-size: 1.2rem; } .brand .tag { color: var(--muted); font-size: .74rem; }
    h2 { margin: .3rem 0 .2rem; }
  `],
})
export class Login {
  auth = inject(AuthService);
  private router = inject(Router);
  private toast = inject(ToastService);
  private t = inject(TranslocoService);
  email = 'marie@vnv.ch'; firstName = 'Marie'; lastName = 'Durand'; roles = 'admin';
  loading = signal(false);

  async devLogin() {
    this.loading.set(true);
    try {
      await this.auth.devLogin({
        email: this.email, first_name: this.firstName, last_name: this.lastName,
        roles: this.roles.split(',').map((r) => r.trim()).filter(Boolean),
      });
      this.router.navigateByUrl('/dashboard');
    } catch { this.toast.error(this.t.translate('login.error')); }
    finally { this.loading.set(false); }
  }
  async oidcLogin() {
    try { await this.auth.login(); } catch { this.toast.error(this.t.translate('login.oidc_error')); }
  }
}
