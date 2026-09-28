import { Component, inject, signal, effect, ViewChild, ElementRef } from '@angular/core';
import {
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
  Router,
  NavigationStart,
  NavigationEnd,
  NavigationCancel,
  NavigationError,
} from '@angular/router';
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

interface NavItem {
  path: string;
  icon: string;
  label: string;
}

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatSidenavModule,
    MatToolbarModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MatTooltipModule,
    TranslocoModule,
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  toast = inject(ToastService);
  auth = inject(AuthService);
  theme = inject(ThemeService);
  lang = inject(LanguageService);
  private router = inject(Router);
  private breakpoints = inject(BreakpointObserver);
  private navHistory = inject(NavHistoryService); // démarre le suivi d'historique tôt
  collapsed = signal(false);
  isMobile = signal(false);
  mobileOpen = signal(false);
  navLoading = signal(false);

  @ViewChild('scrollContent') private scrollContent?: ElementRef<HTMLElement>;

  rail() {
    return this.collapsed() && !this.isMobile();
  }
  toggleNav() {
    if (this.isMobile()) this.mobileOpen.set(!this.mobileOpen());
    else this.collapsed.set(!this.collapsed());
  }
  onNavClick() {
    if (this.isMobile()) this.mobileOpen.set(false);
  }

  constructor() {
    this.theme.init();
    this.breakpoints.observe('(max-width: 768px)').subscribe((r) => this.isMobile.set(r.matches));
    // Barre de progression + remontée en haut + fermeture du menu mobile à chaque navigation.
    this.router.events.subscribe((e) => {
      if (e instanceof NavigationStart) this.navLoading.set(true);
      else if (
        e instanceof NavigationEnd ||
        e instanceof NavigationCancel ||
        e instanceof NavigationError
      ) {
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
      this.auth.updatePrefs({ lang: code }).catch(() => {
        /* appliqué localement */
      });
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
  showShell(): boolean {
    return !this.isPublic() && this.auth.isAuthenticated();
  }
  initials(u: { first_name?: string; last_name?: string; email?: string }) {
    return (u.first_name?.[0] || '') + (u.last_name?.[0] || '') || u.email?.[0] || '?';
  }
  logout() {
    this.auth.logout();
    this.router.navigateByUrl('/login');
  }
}
