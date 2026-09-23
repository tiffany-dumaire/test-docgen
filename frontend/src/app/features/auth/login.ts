import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/api.service';

@Component({
  selector: 'app-login',
  imports: [FormsModule],
  template: `
    <div class="auth-wrap">
      <div class="auth-card card">
        <div class="brand"><span class="logo">📄</span><div><b>DocuGen</b><div class="tag">Génération de documents</div></div></div>
        <h2>Connexion</h2>

        @if (auth.isDev()) {
          <p class="muted">Mode développement : connectez-vous avec un profil de test.</p>
          <div class="field"><label>Email</label><input [(ngModel)]="email" /></div>
          <div class="form-grid">
            <div class="field"><label>Prénom</label><input [(ngModel)]="firstName" /></div>
            <div class="field"><label>Nom</label><input [(ngModel)]="lastName" /></div>
          </div>
          <div class="field"><label>Rôles applicatifs (séparés par des virgules)</label>
            <input [(ngModel)]="roles" placeholder="admin, manager" /></div>
          <button class="btn btn-primary" style="width:100%" (click)="devLogin()" [disabled]="loading()">
            {{ loading() ? 'Connexion…' : 'Se connecter' }}
          </button>
        } @else {
          <p class="muted">Connectez-vous via votre fournisseur d'identité.</p>
          <button class="btn btn-primary" style="width:100%" (click)="oidcLogin()">Se connecter</button>
        }
      </div>
    </div>
  `,
  styles: [`
    .auth-wrap { min-height: 100vh; display: grid; place-items: center; padding: 1.5rem;
      background: radial-gradient(1000px 500px at 50% -10%, #e0e7ff, transparent), var(--bg); }
    .auth-card { width: 100%; max-width: 420px; }
    .brand { display: flex; gap: .7rem; align-items: center; margin-bottom: 1rem; }
    .brand .logo { font-size: 1.5rem; width: 42px; height: 42px; border-radius: 12px; display: grid; place-items: center;
      background: linear-gradient(135deg, #6366f1, #0ea5e9); box-shadow: 0 8px 18px rgba(79,70,229,.4); }
    .brand b { font-size: 1.2rem; } .brand .tag { color: var(--muted); font-size: .74rem; }
    h2 { margin: .3rem 0 .2rem; }
  `],
})
export class Login {
  auth = inject(AuthService);
  private router = inject(Router);
  private toast = inject(ToastService);
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
    } catch { this.toast.error('Connexion impossible.'); }
    finally { this.loading.set(false); }
  }
  async oidcLogin() {
    try { await this.auth.login(); } catch { this.toast.error('Fournisseur d\'identité non configuré.'); }
  }
}
