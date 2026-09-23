import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet, Router } from '@angular/router';
import { ToastService } from './core/services/api.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    @if (isPublic()) {
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
            <a routerLink="/company" routerLinkActive="active">
              <span>🏢</span> Mon entreprise
            </a>
          </nav>
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
        background: #0f172a;
        color: #cbd5e1;
        padding: 1.25rem 1rem;
        position: sticky;
        top: 0;
        height: 100vh;
      }
      .brand {
        display: flex;
        gap: 0.7rem;
        align-items: center;
        padding: 0.5rem;
        margin-bottom: 1.5rem;
      }
      .brand strong {
        color: #fff;
        font-size: 1.15rem;
        display: block;
      }
      .brand .logo {
        font-size: 1.8rem;
      }
      .brand .tag {
        color: #64748b;
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
        padding: 0.6rem 0.8rem;
        border-radius: 8px;
        color: #cbd5e1;
        font-weight: 500;
        font-size: 0.9rem;
      }
      nav a:hover {
        background: #1e293b;
        color: #fff;
        text-decoration: none;
      }
      nav a.active {
        background: #2563eb;
        color: #fff;
      }
      .divider {
        height: 1px;
        background: #1e293b;
        margin: 0.7rem 0.4rem;
      }
      .content {
        padding: 2rem 2.5rem;
        max-width: 1200px;
        width: 100%;
      }
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
  private router = inject(Router);

  isPublic(): boolean {
    return this.router.url.startsWith('/f/');
  }
}
