import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { AuthService } from '@core/auth/auth.service';
import { ToastService } from '@core/services/api.service';

@Component({
  selector: 'app-login',
  imports: [FormsModule, TranslocoModule],
  templateUrl: './login.html',
  styleUrl: './login.scss',
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
