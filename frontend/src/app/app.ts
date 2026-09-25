import { Component, inject, signal, effect, ViewChild, ElementRef } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet, Router,
  NavigationStart, NavigationEnd, NavigationCancel, NavigationError } from '@angular/router';
import { BreakpointObserver } from '@angular/cdk/layout';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslocoModule } from '@jsverse/transloco';
import { ToastService } from './core/services/api.service';
import { AuthService } from './core/services/auth.service';
import { ThemeService } from './core/services/theme.service';
import { LanguageService, Lang } from './core/services/language.service';

interface NavItem { path: string; icon: string; label: string; }

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet, RouterLink, RouterLinkActive,
    MatSidenavModule, MatToolbarModule, MatListModule, MatIconModule,
    MatButtonModule, MatMenuModule, MatTooltipModule, TranslocoModule,
  ],
  template: `
    @if (!showShell()) {
      <router-outlet />
    } @else {
      <a class="skip-link" href="#main-content">{{ 'topbar.skip' | transloco }}</a>
      <mat-sidenav-container class="shell" autosize>
        <mat-sidenav [mode]="isMobile() ? 'over' : 'side'" [opened]="isMobile() ? mobileOpen() : true"
          (closedStart)="mobileOpen.set(false)" [class.rail]="collapsed() && !isMobile()" class="nav">
          <div class="brand" [class.center]="collapsed() && !isMobile()">
            <span class="logo">📄</span>
            @if (!rail()) {
              <div class="brandtext"><strong>DocuGen</strong><div class="tag">Documents</div></div>
            }
          </div>
          <mat-nav-list>
            @for (n of nav; track n.path) {
              <a mat-list-item [routerLink]="n.path" routerLinkActive="active" (click)="onNavClick()"
                 [matTooltip]="rail() ? (n.label | transloco) : ''" matTooltipPosition="right">
                <mat-icon matListItemIcon>{{ n.icon }}</mat-icon>
                @if (!rail()) { <span matListItemTitle>{{ n.label | transloco }}</span> }
              </a>
            }
            <div class="sep"></div>
            @for (n of navBottom; track n.path) {
              <a mat-list-item [routerLink]="n.path" routerLinkActive="active" (click)="onNavClick()"
                 [matTooltip]="rail() ? (n.label | transloco) : ''" matTooltipPosition="right">
                <mat-icon matListItemIcon>{{ n.icon }}</mat-icon>
                @if (!rail()) { <span matListItemTitle>{{ n.label | transloco }}</span> }
              </a>
            }
          </mat-nav-list>
        </mat-sidenav>

        <mat-sidenav-content class="main">
          @if (navLoading()) { <div class="route-progress"><span></span></div> }
          <mat-toolbar class="topbar">
            <button mat-icon-button (click)="toggleNav()" [matTooltip]="'topbar.menu' | transloco">
              <mat-icon>{{ (isMobile() ? !mobileOpen() : collapsed()) ? 'menu' : 'menu_open' }}</mat-icon>
            </button>
            <span class="grow"></span>
            <button mat-icon-button [matMenuTriggerFor]="langMenu" [matTooltip]="'topbar.language' | transloco">
              <mat-icon>translate</mat-icon>
            </button>
            <mat-menu #langMenu="matMenu">
              <div class="tm-head">{{ 'topbar.language' | transloco }}</div>
              @for (l of lang.langs; track l.code) {
                <button mat-menu-item (click)="setLang(l.code)">
                  <span class="tm-dot" style="box-shadow:none">{{ l.flag }}</span>
                  <span class="tm-name">{{ l.label }}</span>
                  @if (lang.active() === l.code) { <mat-icon class="tm-check">check</mat-icon> }
                </button>
              }
            </mat-menu>
            <button mat-icon-button [matMenuTriggerFor]="themeMenu" [matTooltip]="'topbar.theme' | transloco">
              <mat-icon>palette</mat-icon>
            </button>
            <mat-menu #themeMenu="matMenu" class="theme-menu">
              <div class="tm-head">{{ 'topbar.ambiance' | transloco }}</div>
              @for (p of theme.propositions; track p.id) {
                <button mat-menu-item (click)="$event.stopPropagation(); theme.setProposition(p.id)">
                  <span class="tm-dot" [style.background]="p.primary"></span>
                  <span class="tm-name" [style.font-family]="p.font">{{ p.name }}</span>
                  <span class="tm-sub">{{ p.sub }}</span>
                  @if (theme.proposition() === p.id) { <mat-icon class="tm-check">check</mat-icon> }
                </button>
              }
              <div class="tm-head">{{ 'topbar.brightness' | transloco }}</div>
              <div class="tm-modes" (click)="$event.stopPropagation()">
                <button [class.on]="theme.mode() === 'light'" (click)="theme.setMode('light')"><mat-icon>light_mode</mat-icon> {{ 'theme.light' | transloco }}</button>
                <button [class.on]="theme.mode() === 'dark'" (click)="theme.setMode('dark')"><mat-icon>dark_mode</mat-icon> {{ 'theme.dark' | transloco }}</button>
                <button [class.on]="theme.mode() === 'auto'" (click)="theme.setMode('auto')"><mat-icon>brightness_auto</mat-icon> {{ 'theme.auto' | transloco }}</button>
              </div>
            </mat-menu>
            <button mat-icon-button (click)="theme.toggleDark()" [matTooltip]="(theme.resolvedDark() ? 'theme.light' : 'theme.dark') | transloco">
              <mat-icon>{{ theme.resolvedDark() ? 'light_mode' : 'dark_mode' }}</mat-icon>
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
                <a mat-menu-item routerLink="/preferences"><mat-icon>palette</mat-icon> {{ 'user.preferences' | transloco }}</a>
                <button mat-menu-item (click)="logout()"><mat-icon>logout</mat-icon> {{ 'user.logout' | transloco }}</button>
              </mat-menu>
            }
          </mat-toolbar>

          <div class="content" id="main-content" #scrollContent><router-outlet /></div>
        </mat-sidenav-content>
      </mat-sidenav-container>
    }

    @if (toast.message(); as t) {
      <div class="toast" role="status" aria-live="polite"
           [class.error]="t.kind === 'error'" [class.success]="t.kind === 'success'">
        <mat-icon class="ti">{{ t.kind === 'error' ? 'error' : t.kind === 'success' ? 'check_circle' : 'info' }}</mat-icon>
        <span class="tt">{{ t.text }}</span>
        <button class="tc" (click)="toast.dismiss()" aria-label="Fermer"><mat-icon>close</mat-icon></button>
      </div>
    }
  `,
  styles: [`
    .shell { height: 100vh; background: var(--mat-sys-surface-container-low, #f4f5fb); }
    .nav { width: 244px; border: none !important;
      background: var(--mat-sys-surface-container-low) !important;
      border-right: 1px solid var(--mat-sys-outline-variant) !important;
      color: var(--mat-sys-on-surface); transition: width .18s ease; overflow-x: hidden; }
    .nav.rail { width: 72px; }
    .brand { display: flex; align-items: center; gap: .6rem; padding: 1rem 1.1rem; }
    .brand.center { justify-content: center; padding: 1rem .5rem; }
    .brand .logo { font-size: 1.2rem; width: 40px; height: 40px; border-radius: var(--pd-r-s); flex: none;
      display: grid; place-items: center; background: var(--brand, var(--mat-sys-primary)); color: var(--mat-sys-on-primary); }
    .brand strong { color: var(--mat-sys-on-surface); font-family: var(--pd-display); letter-spacing: var(--pd-display-track); font-size: 1.1rem; }
    .brand .tag { color: var(--mat-sys-on-surface-variant); font-size: .7rem; }
    mat-nav-list { --mat-list-list-item-label-text-color: var(--mat-sys-on-surface-variant); padding: 0 .5rem; }
    mat-nav-list a { border-radius: var(--pd-r-btn); }
    mat-nav-list a.active { background: var(--mat-sys-secondary-container);
      color: var(--mat-sys-on-secondary-container); border-radius: var(--pd-r-btn); }
    mat-nav-list a.active mat-icon, mat-nav-list a.active span { color: var(--mat-sys-on-secondary-container); }
    mat-nav-list mat-icon { color: var(--mat-sys-on-surface-variant); }
    .sep { height: 1px; background: var(--mat-sys-outline-variant); margin: .5rem .8rem; }
    /* Menu de thème */
    .tm-head { padding: .4rem 1rem .2rem; font-size: .68rem; text-transform: uppercase; letter-spacing: .08em; color: var(--mat-sys-on-surface-variant); font-weight: 700; }
    .tm-dot { width: 14px; height: 14px; border-radius: 50%; margin-right: .6rem; box-shadow: inset 0 0 0 1px rgba(0,0,0,.15); }
    .tm-name { font-weight: 600; }
    .tm-sub { margin-left: .5rem; color: var(--mat-sys-on-surface-variant); font-size: .75rem; }
    .tm-check { margin-left: auto; color: var(--mat-sys-primary); }
    .tm-modes { display: flex; gap: .3rem; padding: .2rem .8rem .6rem; }
    .tm-modes button { flex: 1; display: flex; flex-direction: column; align-items: center; gap: .2rem; border: 1px solid var(--mat-sys-outline-variant); background: transparent; color: var(--mat-sys-on-surface-variant); border-radius: var(--pd-r-s); padding: .4rem; cursor: pointer; font-size: .72rem; }
    .tm-modes button mat-icon { font-size: 20px; width: 20px; height: 20px; }
    .tm-modes button.on { background: var(--mat-sys-secondary-container); color: var(--mat-sys-on-secondary-container); border-color: transparent; }
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
      padding: .7rem .8rem .7rem 1rem; border-radius: 12px; box-shadow: 0 18px 44px rgba(0,0,0,.3);
      display: flex; align-items: center; gap: .6rem; max-width: 420px; }
    .toast.error { background: #dc2626; } .toast.success { background: #16a34a; }
    .toast .ti { font-size: 20px; width: 20px; height: 20px; flex: none; }
    .toast .tt { flex: 1; line-height: 1.35; }
    .toast .tc { background: transparent; border: none; color: inherit; opacity: .8; cursor: pointer;
      display: grid; place-items: center; padding: 2px; border-radius: 6px; }
    .toast .tc:hover { opacity: 1; background: rgba(255,255,255,.15); }
    .toast .tc mat-icon { font-size: 18px; width: 18px; height: 18px; }
    /* Barre de progression de navigation (chargement de route / chunk) */
    .route-progress { position: sticky; top: 0; left: 0; right: 0; height: 3px; z-index: 6;
      background: color-mix(in srgb, var(--mat-sys-primary) 18%, transparent); overflow: hidden; }
    .route-progress span { position: absolute; height: 100%; width: 40%;
      background: var(--mat-sys-primary); border-radius: 3px; animation: route-slide 1.1s ease-in-out infinite; }
    @keyframes route-slide { 0% { left: -40%; } 50% { left: 30%; } 100% { left: 100%; } }
    /* Lien d'évitement (accessibilité clavier) */
    .skip-link { position: fixed; left: 12px; top: -60px; z-index: 2000;
      background: var(--mat-sys-primary); color: var(--mat-sys-on-primary);
      padding: .55rem 1rem; border-radius: 8px; font-weight: 700; transition: top .18s ease; }
    .skip-link:focus { top: 12px; text-decoration: none; }
  `],
})
export class App {
  toast = inject(ToastService);
  auth = inject(AuthService);
  theme = inject(ThemeService);
  lang = inject(LanguageService);
  private router = inject(Router);
  private breakpoints = inject(BreakpointObserver);
  collapsed = signal(false);
  isMobile = signal(false);
  mobileOpen = signal(false);
  navLoading = signal(false);

  @ViewChild('scrollContent') private scrollContent?: ElementRef<HTMLElement>;

  rail() { return this.collapsed() && !this.isMobile(); }
  toggleNav() {
    if (this.isMobile()) this.mobileOpen.set(!this.mobileOpen());
    else this.collapsed.set(!this.collapsed());
  }
  onNavClick() { if (this.isMobile()) this.mobileOpen.set(false); }

  constructor() {
    this.theme.init();
    this.breakpoints.observe('(max-width: 768px)').subscribe((r) => this.isMobile.set(r.matches));
    // Barre de progression + remontée en haut + fermeture du menu mobile à chaque navigation.
    this.router.events.subscribe((e) => {
      if (e instanceof NavigationStart) this.navLoading.set(true);
      else if (e instanceof NavigationEnd || e instanceof NavigationCancel || e instanceof NavigationError) {
        this.navLoading.set(false);
        if (e instanceof NavigationEnd) {
          if (this.isMobile()) this.mobileOpen.set(false);
          queueMicrotask(() => {
            // Le conteneur défilant est .mat-drawer-content ; repli sur la fenêtre.
            const scroller = document.querySelector('.mat-drawer-content') as HTMLElement | null;
            (scroller ?? this.scrollContent?.nativeElement)?.scrollTo({ top: 0 });
            window.scrollTo({ top: 0 });
          });
        }
      }
    });
    // Applique la langue enregistrée dans le profil dès qu'il est chargé.
    effect(() => {
      const prefLang = this.auth.user()?.ui_prefs?.['lang'] as Lang | undefined;
      if (prefLang && prefLang !== this.lang.active()) this.lang.set(prefLang, false);
    });
  }

  setLang(code: Lang) {
    this.lang.set(code);
    if (this.auth.isAuthenticated()) {
      this.auth.updatePrefs({ lang: code }).catch(() => { /* appliqué localement */ });
    }
  }

  // Les libellés sont des clés i18n (pipe transloco).
  nav: NavItem[] = [
    { path: '/dashboard', icon: 'dashboard', label: 'nav.dashboard' },
    { path: '/projects', icon: 'folder', label: 'nav.projects' },
    { path: '/suivi', icon: 'fact_check', label: 'nav.tracking' },
    { path: '/templates', icon: 'grid_view', label: 'nav.templates' },
  ];
  navBottom: NavItem[] = [
    { path: '/clients', icon: 'handshake', label: 'nav.clients' },
    { path: '/company', icon: 'business', label: 'nav.company' },
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
