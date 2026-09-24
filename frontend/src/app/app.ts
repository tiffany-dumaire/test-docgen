import { Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet, Router } from '@angular/router';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ToastService } from './core/services/api.service';
import { AuthService } from './core/services/auth.service';

interface NavItem { path: string; icon: string; label: string; }

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet, RouterLink, RouterLinkActive,
    MatSidenavModule, MatToolbarModule, MatListModule, MatIconModule,
    MatButtonModule, MatMenuModule, MatTooltipModule,
  ],
  template: `
    @if (!showShell()) {
      <router-outlet />
    } @else {
      <mat-sidenav-container class="shell" autosize>
        <mat-sidenav mode="side" opened [class.rail]="collapsed()" class="nav">
          <div class="brand" [class.center]="collapsed()">
            <span class="logo">📄</span>
            @if (!collapsed()) {
              <div class="brandtext"><strong>DocuGen</strong><div class="tag">Documents</div></div>
            }
          </div>
          <mat-nav-list>
            @for (n of nav; track n.path) {
              <a mat-list-item [routerLink]="n.path" routerLinkActive="active"
                 [matTooltip]="collapsed() ? n.label : ''" matTooltipPosition="right">
                <mat-icon matListItemIcon>{{ n.icon }}</mat-icon>
                @if (!collapsed()) { <span matListItemTitle>{{ n.label }}</span> }
              </a>
            }
            <div class="sep"></div>
            @for (n of navBottom; track n.path) {
              <a mat-list-item [routerLink]="n.path" routerLinkActive="active"
                 [matTooltip]="collapsed() ? n.label : ''" matTooltipPosition="right">
                <mat-icon matListItemIcon>{{ n.icon }}</mat-icon>
                @if (!collapsed()) { <span matListItemTitle>{{ n.label }}</span> }
              </a>
            }
          </mat-nav-list>
        </mat-sidenav>

        <mat-sidenav-content class="main">
          <mat-toolbar class="topbar">
            <button mat-icon-button (click)="collapsed.set(!collapsed())" matTooltip="Menu">
              <mat-icon>{{ collapsed() ? 'menu' : 'menu_open' }}</mat-icon>
            </button>
            <span class="grow"></span>
            <button mat-icon-button (click)="auth.toggleDark()" [matTooltip]="auth.isDark() ? 'Mode clair' : 'Mode sombre'">
              <mat-icon>{{ auth.isDark() ? 'light_mode' : 'dark_mode' }}</mat-icon>
            </button>
            @if (auth.user(); as u) {
              <button mat-button [matMenuTriggerFor]="menu" class="userbtn">
                <span class="avatar">{{ initials(u) }}</span>
                <span class="uname">{{ u.full_name || u.email }}</span>
                <mat-icon>arrow_drop_down</mat-icon>
              </button>
              <mat-menu #menu="matMenu">
                <div class="menuhead">
                  <div class="mn">{{ u.full_name || u.email }}</div>
                  <div class="mr">{{ u.primary_app_role }}</div>
                </div>
                <a mat-menu-item routerLink="/preferences"><mat-icon>palette</mat-icon> Préférences</a>
                <button mat-menu-item (click)="logout()"><mat-icon>logout</mat-icon> Se déconnecter</button>
              </mat-menu>
            }
          </mat-toolbar>

          <div class="content"><router-outlet /></div>
        </mat-sidenav-content>
      </mat-sidenav-container>
    }

    @if (toast.message(); as t) {
      <div class="toast" [class.error]="t.kind === 'error'" [class.success]="t.kind === 'success'">
        {{ t.text }}
      </div>
    }
  `,
  styles: [`
    .shell { height: 100vh; background: var(--mat-sys-surface-container-low, #f4f5fb); }
    .nav { width: 244px; border: none !important;
      background:
        radial-gradient(420px 220px at 20% 0%, rgba(45,212,191,.16), transparent 60%),
        radial-gradient(420px 260px at 90% 12%, rgba(139,92,246,.20), transparent 60%),
        linear-gradient(190deg, #0c1730, #070d1c 70%) !important;
      color: #cfe0f5; transition: width .18s ease; overflow-x: hidden; }
    .nav.rail { width: 72px; }
    .brand { display: flex; align-items: center; gap: .6rem; padding: 1rem 1.1rem; }
    .brand.center { justify-content: center; padding: 1rem .5rem; }
    .brand .logo { font-size: 1.4rem; width: 40px; height: 40px; border-radius: 12px; flex: none;
      display: grid; place-items: center; background: linear-gradient(135deg, #2dd4bf, var(--brand, #3b82f6) 55%, #8b5cf6);
      box-shadow: 0 8px 20px rgba(59,130,246,.45); }
    .brand strong { color: #fff; letter-spacing: -.02em; font-size: 1.1rem; }
    .brand .tag { color: #8ea6cc; font-size: .7rem; }
    mat-nav-list { --mat-list-list-item-label-text-color: #cfe0f5; padding: 0 .5rem; }
    mat-nav-list a.active { background: linear-gradient(100deg, color-mix(in srgb, var(--brand,#3b82f6) 92%, transparent), #8b5cf6 130%);
      color: #fff; border-radius: 12px; box-shadow: 0 8px 20px rgba(59,130,246,.28); }
    mat-nav-list a.active mat-icon { color: #fff; }
    mat-nav-list mat-icon { color: #93b0d6; }
    .sep { height: 1px; background: rgba(255,255,255,.10); margin: .5rem .8rem; }
    .main { background: var(--mat-sys-surface-container-low, #f4f5fb); }
    .topbar { position: sticky; top: 0; z-index: 5;
      background: color-mix(in srgb, var(--mat-sys-surface) 88%, transparent);
      backdrop-filter: blur(10px); border-bottom: 1px solid var(--mat-sys-outline-variant); }
    .grow { flex: 1; }
    .userbtn { display: inline-flex; align-items: center; gap: .5rem; }
    .avatar { width: 30px; height: 30px; border-radius: 50%; flex: none; display: grid; place-items: center;
      color: #fff; font-weight: 700; font-size: .75rem; text-transform: uppercase;
      background: linear-gradient(135deg, var(--brand,#3b82f6), #22d3ee); }
    .uname { font-weight: 600; max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    @media (max-width: 640px) { .uname { display: none; } }
    .menuhead { padding: .6rem 1rem; border-bottom: 1px solid var(--mat-sys-outline-variant); }
    .menuhead .mn { font-weight: 700; } .menuhead .mr { font-size: .75rem; color: var(--mat-sys-outline); text-transform: capitalize; }
    .content { padding: 1.8rem 2.2rem; max-width: 1280px; }
    @media (max-width: 700px) { .content { padding: 1rem; } }
    .toast { position: fixed; bottom: 1.4rem; right: 1.4rem; z-index: 1000; background: #0f172a; color: #fff;
      padding: .8rem 1.15rem; border-radius: 12px; box-shadow: 0 18px 44px rgba(0,0,0,.3); }
    .toast.error { background: #dc2626; } .toast.success { background: #16a34a; }
  `],
})
export class App {
  toast = inject(ToastService);
  auth = inject(AuthService);
  private router = inject(Router);
  collapsed = signal(false);

  nav: NavItem[] = [
    { path: '/dashboard', icon: 'dashboard', label: 'Tableau de bord' },
    { path: '/projects', icon: 'folder', label: 'Projets' },
    { path: '/suivi', icon: 'fact_check', label: 'Suivi général' },
    { path: '/templates', icon: 'grid_view', label: 'Modèles' },
  ];
  navBottom: NavItem[] = [
    { path: '/clients', icon: 'handshake', label: 'Clients' },
    { path: '/company', icon: 'business', label: 'Mon entreprise' },
  ];

  isPublic(): boolean {
    const u = this.router.url;
    return u.startsWith('/f/') || u.startsWith('/login') || u.startsWith('/auth/');
  }
  showShell(): boolean { return !this.isPublic() && this.auth.isAuthenticated(); }
  initials(u: { first_name?: string; last_name?: string; email?: string }) {
    return ((u.first_name?.[0] || '') + (u.last_name?.[0] || '')) || (u.email?.[0] || '?');
  }
  logout() { this.auth.logout(); this.router.navigateByUrl('/login'); }
}
