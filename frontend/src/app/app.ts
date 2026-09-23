import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet, Router } from '@angular/router';
import { ToastService } from './core/services/api.service';
import { AuthService } from './core/services/auth.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    @if (!showShell()) {
      <router-outlet />
    } @else {
      <div class="layout">
        <aside class="sidebar">
          <div class="brand">
            <span class="logo">📄</span>
            <div>
              <strong>DocuGen</strong>
              <div class="tag">Génération de documents</div>
            </div>
          </div>
          <nav>
            <a routerLink="/dashboard" routerLinkActive="active">
              <span>📊</span> Tableau de bord
            </a>
            <a routerLink="/projects" routerLinkActive="active">
              <span>📁</span> Projets
            </a>
            <a routerLink="/documents" routerLinkActive="active">
              <span>📄</span> Documents
            </a>
            <a routerLink="/templates" routerLinkActive="active">
              <span>🧩</span> Modèles
            </a>
            <a routerLink="/forms" routerLinkActive="active">
              <span>📝</span> Formulaires
            </a>
            <div class="divider"></div>
            <a routerLink="/clients" routerLinkActive="active">
              <span>🤝</span> Clients
            </a>
            <a routerLink="/teams" routerLinkActive="active">
              <span>👥</span> Équipes
            </a>
            <a routerLink="/company" routerLinkActive="active">
              <span>🏢</span> Mon entreprise
            </a>
          </nav>
          @if (auth.user(); as u) {
            <div class="user-box">
              <div class="avatar">{{ (u.first_name[0] || '') + (u.last_name[0] || '') || '?' }}</div>
              <div class="ubody">
                <div class="uname">{{ u.full_name || u.email }}</div>
                <div class="urole">{{ u.primary_app_role }}</div>
              </div>
              <a class="logout" routerLink="/preferences" title="Préférences">⚙</a>
              <button class="logout" (click)="logout()" title="Se déconnecter">⏻</button>
            </div>
          }
        </aside>
        <main class="content">
          <router-outlet />
        </main>
      </div>
    }

    @if (toast.message(); as t) {
      <div class="toast" [class.error]="t.kind === 'error'" [class.success]="t.kind === 'success'">
        {{ t.text }}
      </div>
    }
  `,
  styles: [
    `
      .layout {
        display: grid;
        grid-template-columns: 250px 1fr;
        min-height: 100vh;
      }
      .sidebar {
        background: linear-gradient(185deg, #111a30 0%, #0b1222 100%);
        color: #cbd5e1;
        padding: 1.25rem 0.9rem;
        position: sticky;
        top: 0;
        height: 100vh;
        border-right: 1px solid rgba(148, 163, 184, 0.12);
        display: flex; flex-direction: column;
      }
      .brand {
        display: flex;
        gap: 0.7rem;
        align-items: center;
        padding: 0.5rem 0.6rem 0.9rem;
        margin-bottom: 1rem;
        border-bottom: 1px solid rgba(148, 163, 184, 0.12);
      }
      .brand strong {
        color: #fff;
        font-size: 1.18rem;
        display: block;
        letter-spacing: -0.02em;
      }
      .brand .logo {
        font-size: 1.6rem;
        background: linear-gradient(135deg, #6366f1, #0ea5e9);
        width: 38px; height: 38px; border-radius: 11px;
        display: grid; place-items: center;
        box-shadow: 0 6px 16px rgba(79, 70, 229, 0.45);
      }
      .brand .tag {
        color: #7c8aa5;
        font-size: 0.72rem;
      }
      nav {
        display: flex;
        flex-direction: column;
        gap: 0.15rem;
      }
      nav a {
        display: flex;
        align-items: center;
        gap: 0.7rem;
        padding: 0.62rem 0.8rem;
        border-radius: 9px;
        color: #b7c2d6;
        font-weight: 500;
        font-size: 0.9rem;
        transition: background .14s ease, color .14s ease;
      }
      nav a:hover {
        background: rgba(148, 163, 184, 0.12);
        color: #fff;
        text-decoration: none;
      }
      nav a.active {
        background: linear-gradient(90deg, rgba(99,102,241,.95), rgba(79,70,229,.9));
        color: #fff;
        box-shadow: 0 6px 16px rgba(79, 70, 229, 0.35);
      }
      .divider {
        height: 1px;
        background: rgba(148, 163, 184, 0.14);
        margin: 0.7rem 0.4rem;
      }
      .content {
        padding: 2rem 2.5rem;
        max-width: 1240px;
        width: 100%;
      }
      .user-box {
        margin-top: auto;
        display: flex; align-items: center; gap: .6rem;
        padding: .6rem; border-radius: 10px; background: rgba(148,163,184,.10);
      }
      .user-box .avatar {
        width: 34px; height: 34px; border-radius: 50%; flex: none;
        background: linear-gradient(135deg, #6366f1, #0ea5e9); color: #fff;
        display: grid; place-items: center; font-weight: 700; font-size: .78rem; text-transform: uppercase;
      }
      .user-box .ubody { min-width: 0; flex: 1; }
      .user-box .uname { color: #fff; font-size: .82rem; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .user-box .urole { color: #7c8aa5; font-size: .7rem; text-transform: capitalize; }
      .user-box .logout { background: transparent; border: 1px solid rgba(148,163,184,.3); color: #cbd5e1; border-radius: 8px; cursor: pointer; padding: .3rem .5rem; }
      .user-box .logout:hover { background: rgba(239,68,68,.2); color: #fff; border-color: transparent; }
      @media (max-width: 768px) {
        .layout {
          grid-template-columns: 1fr;
        }
        .sidebar {
          position: relative;
          height: auto;
        }
        .content {
          padding: 1.25rem;
        }
      }
    `,
  ],
})
export class App {
  toast = inject(ToastService);
  auth = inject(AuthService);
  private router = inject(Router);

  isPublic(): boolean {
    const u = this.router.url;
    return u.startsWith('/f/') || u.startsWith('/login') || u.startsWith('/auth/');
  }
  showShell(): boolean {
    return !this.isPublic() && this.auth.isAuthenticated();
  }
  logout() { this.auth.logout(); this.router.navigateByUrl('/login'); }
}
