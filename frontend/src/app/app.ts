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
import { ToastService } from '@core/services/api.service';
import { AuthService } from '@core/auth/auth.service';
import { ThemeService } from '@core/services/theme.service';
import { LanguageService, Lang } from '@core/services/language.service';
import { NavHistoryService } from '@shared/back.directive';

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
      <div class="app-shell">
        <!-- ===== Barre supérieure : pleine largeur de l'application ===== -->
        <mat-toolbar class="topbar">
          @if (isMobile()) {
            <button mat-icon-button (click)="mobileOpen.set(!mobileOpen())" [matTooltip]="'topbar.menu' | transloco">
              <mat-icon>menu</mat-icon>
            </button>
          }
          <a class="brand" routerLink="/dashboard">
            <span class="logo"><img src="/images/logo/polydocs-6b.svg" alt="PolyDocs" /></span>
            <span class="brandtext"><strong>PolyDocs</strong><span class="tag">Documents</span></span>
          </a>
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
            <button type="button" [matMenuTriggerFor]="menu" class="userbtn">
              <span class="avatar">{{ initials(u) }}</span>
              <span class="uname">{{ u.full_name || u.email }}</span>
              <mat-icon class="ucaret">arrow_drop_down</mat-icon>
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

        @if (navLoading()) { <div class="route-progress"><span></span></div> }

        <!-- ===== Conteneur sidenav + contenu, SOUS la barre ===== -->
        <mat-sidenav-container class="shell" autosize>
          <mat-sidenav [mode]="isMobile() ? 'over' : 'side'" [opened]="isMobile() ? mobileOpen() : true"
            (closedStart)="mobileOpen.set(false)" [class.rail]="collapsed() && !isMobile()" class="nav">
            <!-- Motif décoratif « papier plié » (rappel du logo), collé au thème -->
            <svg class="nav-motif" viewBox="0 0 244 260" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
              <polygon points="-8,260 58,116 120,260" fill="currentColor" opacity=".55"/>
              <polygon points="58,116 120,260 152,178" fill="currentColor" opacity=".33"/>
              <polygon points="120,260 152,178 212,120 252,260" fill="currentColor" opacity=".5"/>
              <polygon points="152,178 212,120 204,260" fill="currentColor" opacity=".26"/>
              <polygon points="42,54 60,46 55,74 37,80" fill="currentColor" opacity=".5"/>
              <polygon points="55,74 37,80 49,60" fill="currentColor" opacity=".3"/>
              <polygon points="192,40 210,47 203,72 185,65" fill="currentColor" opacity=".4"/>
            </svg>
            @if (!isMobile()) {
              <button type="button" class="rail-toggle" (click)="collapsed.set(!collapsed())"
                [matTooltip]="'topbar.menu' | transloco" matTooltipPosition="right"
                [attr.aria-label]="'topbar.menu' | transloco">
                <mat-icon>{{ collapsed() ? 'chevron_right' : 'chevron_left' }}</mat-icon>
              </button>
            }
            <nav class="railnav" [class.israil]="rail()">
              @for (n of nav; track n.path) {
                <a [routerLink]="n.path" routerLinkActive="active" (click)="onNavClick()" class="railitem"
                   [matTooltip]="rail() ? (n.label | transloco) : ''" matTooltipPosition="right">
                  <span class="ico"><mat-icon>{{ n.icon }}</mat-icon></span>
                  <span class="lbl">{{ n.label | transloco }}</span>
                </a>
              }
              <div class="sep"></div>
              @for (n of navBottom; track n.path) {
                <a [routerLink]="n.path" routerLinkActive="active" (click)="onNavClick()" class="railitem"
                   [matTooltip]="rail() ? (n.label | transloco) : ''" matTooltipPosition="right">
                  <span class="ico"><mat-icon>{{ n.icon }}</mat-icon></span>
                  <span class="lbl">{{ n.label | transloco }}</span>
                </a>
              }
            </nav>
          </mat-sidenav>

          <mat-sidenav-content class="main">
            <div class="content" id="main-content" #scrollContent><router-outlet /></div>
          </mat-sidenav-content>
        </mat-sidenav-container>
      </div>
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
    /* Coquille : barre en haut (pleine largeur) puis conteneur en dessous */
    .app-shell { height: 100vh; display: flex; flex-direction: column;
      background: var(--mat-sys-surface-container-low, #f4f5fb); }

    /* Barre supérieure pleine largeur */
    .topbar { flex: none; z-index: 20; gap: .1rem; height: 60px;
      background: color-mix(in srgb, var(--mat-sys-surface) 90%, var(--mat-sys-primary) 4%);
      backdrop-filter: blur(10px);
      border-bottom: 1px solid var(--mat-sys-outline-variant); }
    .topbar .brand { display: inline-flex; align-items: center; gap: .55rem; margin-left: .25rem;
      text-decoration: none; }
    .topbar .brand:hover { text-decoration: none; }
    .topbar .brand .logo { width: 34px; height: 34px; flex: none; display: grid; place-items: center; }
    .topbar .brand .logo img { width: 100%; height: 100%; display: block; }
    .topbar .brand .brandtext { display: flex; flex-direction: column; line-height: 1.05; }
    .topbar .brand strong { color: var(--mat-sys-on-surface); font-family: var(--pd-display);
      letter-spacing: var(--pd-display-track); font-size: 1.05rem; }
    .topbar .brand .tag { color: var(--mat-sys-on-surface-variant); font-size: .6rem;
      text-transform: uppercase; letter-spacing: .16em; margin-top: .12rem; }
    @media (max-width: 560px) { .topbar .brand .brandtext { display: none; } }
    .grow { flex: 1; }

    /* Conteneur (sidenav + contenu) sous la barre, occupe le reste de la hauteur */
    .shell { flex: 1 1 auto; min-height: 0; background: var(--mat-sys-surface-container-low, #f4f5fb); }
    /* Fond du contenu : voiles de couleur du thème + line-art « papier plié » (masque SVG, teinté par le thème) */
    .main { position: relative; background:
        radial-gradient(1200px 620px at 78% 30%, color-mix(in srgb, var(--mat-sys-primary) 9%, transparent), transparent 60%),
        radial-gradient(1000px 520px at 8% -8%, color-mix(in srgb, var(--mat-sys-tertiary) 7%, transparent), transparent 55%),
        var(--mat-sys-surface); }
    .main::before { content: ""; position: absolute; inset: 0; pointer-events: none; z-index: 0;
      background: var(--mat-sys-primary); opacity: .15;
      -webkit-mask: url('/images/bg-lines.svg') center / cover no-repeat;
      mask: url('/images/bg-lines.svg') center / cover no-repeat; }
    :root.dark .main::before { opacity: .18; }

    /* ===== Sidenav original, collé au thème, avec motif « papier plié » ===== */
    .nav { width: 244px; overflow: hidden; color: var(--mat-sys-on-surface);
      border: none !important; border-right: 1px solid var(--mat-sys-outline-variant) !important;
      background: linear-gradient(180deg,
        color-mix(in srgb, var(--mat-sys-primary) 8%, var(--mat-sys-surface-container)) 0%,
        var(--mat-sys-surface-container-low) 46%) !important;
      transition: width .18s ease; }
    .nav.rail { width: 72px; }
    .nav-motif { position: absolute; left: 0; right: 0; bottom: 0; width: 100%; height: 58%;
      color: var(--mat-sys-primary); opacity: .13; pointer-events: none; z-index: 0; }
    /* Bouton de réduction : flèche sur le côté (bord droit) de la sidebar */
    .rail-toggle { position: absolute; top: 50%; right: 0px; transform: translateY(-50%); z-index: 3;
      width: 28px; padding: 0; height: 28px; border-radius: 50%; border: 1px solid var(--mat-sys-outline-variant);
      background: var(--mat-sys-surface-container-lowest); color: var(--mat-sys-on-surface-variant);
      display: grid; place-items: center; cursor: pointer; box-shadow: var(--shadow-xs);
      transition: background .14s ease, color .14s ease, border-color .14s ease, box-shadow .14s ease; }
    .rail-toggle:hover { color: var(--mat-sys-primary); border-color: var(--mat-sys-primary); box-shadow: var(--shadow); }
    .rail-toggle mat-icon { font-size: 20px; width: 20px; height: 20px; }

    /* Navigation rail / drawer (Material 3) */
    .railnav { position: relative; z-index: 1; display: flex; flex-direction: column; gap: .2rem; padding: .9rem .55rem; }
    .railitem { display: flex; align-items: center; gap: .75rem; padding: .4rem .5rem; border-radius: var(--pd-r-btn);
      color: var(--mat-sys-on-surface-variant); text-decoration: none; transition: background .14s ease, color .14s ease; }
    .railitem:hover { background: color-mix(in srgb, var(--mat-sys-on-surface) 5%, transparent); text-decoration: none; }
    .railitem .ico { display: grid; place-items: center; width: 46px; height: 40px; border-radius: 999px; flex: none;
      transition: background .16s ease; }
    .railitem .ico mat-icon { font-size: 24px; width: 24px; height: 24px; line-height: 24px;
      color: var(--mat-sys-on-surface-variant); }
    .railitem .lbl { font-weight: 600; font-size: .92rem; white-space: nowrap; }
    .railitem.active { color: var(--mat-sys-on-secondary-container); }
    .railitem.active .ico { background: var(--mat-sys-secondary-container); }
    .railitem.active .ico mat-icon { color: var(--mat-sys-on-secondary-container); }
    /* Mode rail : icônes centrées, empilées sur un petit libellé */
    .railnav.israil { padding: .9rem .35rem; }
    .railnav.israil .railitem { flex-direction: column; gap: .15rem; padding: .45rem 0; }
    .railnav.israil .railitem .ico { width: 100%; }
    .railnav.israil .railitem .lbl { font-size: .6rem; font-weight: 600; opacity: .9; }
    .sep { height: 1px; background: var(--mat-sys-outline-variant); margin: .55rem .8rem; }

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

    .userbtn { display: inline-flex; align-items: center; gap: .5rem; flex-wrap: nowrap; white-space: nowrap;
      height: 42px; padding: 0 .35rem 0 .45rem; border: none; background: transparent; cursor: pointer;
      color: var(--mat-sys-on-surface); font: inherit; border-radius: 999px; transition: background .14s ease; }
    .userbtn:hover { background: color-mix(in srgb, var(--mat-sys-on-surface) 6%, transparent); }
    .userbtn .ucaret { flex: none; color: var(--mat-sys-on-surface-variant); font-size: 22px; width: 22px; height: 22px; }
    .avatar { width: 32px; height: 32px; border-radius: 50%; flex: none; display: grid; place-items: center;
      color: var(--mat-sys-on-primary); font-weight: 700; font-size: .78rem; text-transform: uppercase;
      background: linear-gradient(135deg, var(--brand, var(--mat-sys-primary)), var(--mat-sys-tertiary)); }
    .uname { font-weight: 600; max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    @media (max-width: 640px) { .uname { display: none; } }
    .menuhead { padding: .6rem 1rem; border-bottom: 1px solid var(--mat-sys-outline-variant); }
    .menuhead .mn { font-weight: 700; } .menuhead .mr { font-size: .75rem; color: var(--mat-sys-outline); text-transform: capitalize; }

    .content { position: relative; z-index: 1; padding: 1.8rem 2.2rem; max-width: 1240px; margin: 0 auto; width: 100%; }
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
    .route-progress { position: relative; flex: none; height: 3px; z-index: 6;
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
  private navHistory = inject(NavHistoryService);  // démarre le suivi d'historique tôt
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
