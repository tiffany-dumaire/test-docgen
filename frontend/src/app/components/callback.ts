import { Component, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '@core/auth/auth.service';

@Component({
  selector: 'app-auth-callback',
  templateUrl: './callback.html',
})
export class AuthCallback implements OnInit {
  private auth = inject(AuthService);
  private router = inject(Router);
  status = signal('Connexion en cours…');

  async ngOnInit() {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    if (!code) { this.status.set('Code d\'autorisation manquant.'); return; }
    try {
      await this.auth.handleCallback(code);
      this.router.navigateByUrl('/dashboard');
    } catch {
      this.status.set('Échec de la connexion. Réessayez.');
    }
  }
}
