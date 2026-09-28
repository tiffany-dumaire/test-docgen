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
  template: `
    @if (!showShell()) {
      <router-outlet />
    } @else {
      <a class="skip-link" href="#main-content">{{ 'topbar.skip' | transloco }}</a>
      <div class="app-shell">
        <!-- ===== Barre supérieure : pleine largeur de l'application ===== -->
        <mat-toolbar class="topbar">
          @if (isMobile()) {
            <button
              mat-icon-button
              (click)="mobileOpen.set(!mobileOpen())"
              [matTooltip]="'topbar.menu' | transloco"
            >
              <mat-icon>menu</mat-icon>
            </button>
          }
          <a class="brand" routerLink="/dashboard">
            <span class="logo"><img src="/images/logo/polydocs-6b.svg" alt="PolyDocs" /></span>
            <span class="brandtext"
              ><strong>PolyDocs</strong><span class="tag">Documents</span></span
            >
          </a>
          <span class="grow"></span>
          <button
            mat-icon-button
            [matMenuTriggerFor]="langMenu"
            [matTooltip]="'topbar.language' | transloco"
          >
            <mat-icon>translate</mat-icon>
          </button>
          <mat-menu #langMenu="matMenu">
            <div class="tm-head">{{ 'topbar.language' | transloco }}</div>
            @for (l of lang.langs; track l.code) {
              <button mat-menu-item (click)="setLang(l.code)">
                <span class="tm-dot" style="box-shadow:none">{{ l.flag }}</span>
                <span class="tm-name">{{ l.label }}</span>
                @if (lang.active() === l.code) {
                  <mat-icon class="tm-check">check</mat-icon>
                }
              </button>
            }
          </mat-menu>
          <button
            mat-icon-button
            [matMenuTriggerFor]="themeMenu"
            [matTooltip]="'topbar.theme' | transloco"
          >
            <mat-icon>palette</mat-icon>
          </button>
          <mat-menu #themeMenu="matMenu" class="theme-menu">
            <div class="tm-head">{{ 'topbar.ambiance' | transloco }}</div>
            @for (p of theme.propositions; track p.id) {
              <button mat-menu-item (click)="$event.stopPropagation(); theme.setProposition(p.id)">
                <span class="tm-dot" [style.background]="p.primary"></span>
                <span class="tm-name" [style.font-family]="p.font">{{ p.name }}</span>
                <span class="tm-sub">{{ p.sub }}</span>
                @if (theme.proposition() === p.id) {
                  <mat-icon class="tm-check">check</mat-icon>
                }
              </button>
            }
            <div class="tm-head">{{ 'topbar.brightness' | transloco }}</div>
            <div class="tm-modes" (click)="$event.stopPropagation()">
              <button [class.on]="theme.mode() === 'light'" (click)="theme.setMode('light')">
                <mat-icon>light_mode</mat-icon> {{ 'theme.light' | transloco }}
              </button>
              <button [class.on]="theme.mode() === 'dark'" (click)="theme.setMode('dark')">
                <mat-icon>dark_mode</mat-icon> {{ 'theme.dark' | transloco }}
              </button>
              <button [class.on]="theme.mode() === 'auto'" (click)="theme.setMode('auto')">
                <mat-icon>brightness_auto</mat-icon> {{ 'theme.auto' | transloco }}
              </button>
            </div>
          </mat-menu>
          <button
            mat-icon-button
            (click)="theme.toggleDark()"
            [matTooltip]="(theme.resolvedDark() ? 'theme.light' : 'theme.dark') | transloco"
          >
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
              <a mat-menu-item routerLink="/preferences"
                ><mat-icon>palette</mat-icon> {{ 'user.preferences' | transloco }}</a
              >
              <button mat-menu-item (click)="logout()">
                <mat-icon>logout</mat-icon> {{ 'user.logout' | transloco }}
              </button>
            </mat-menu>
          }
        </mat-toolbar>

        @if (navLoading()) {
          <div class="route-progress"><span></span></div>
        }

        <!-- ===== Conteneur sidenav + contenu, SOUS la barre ===== -->
        <mat-sidenav-container class="shell" autosize>
          <mat-sidenav
            [mode]="isMobile() ? 'over' : 'side'"
            [opened]="isMobile() ? mobileOpen() : true"
            (closedStart)="mobileOpen.set(false)"
            [class.rail]="collapsed() && !isMobile()"
            class="nav"
          >
            <!-- Motif décoratif « papier plié » (rappel du logo), collé au thème -->
            <svg
              class="nav-motif"
              viewBox="0 0 244 260"
              preserveAspectRatio="xMidYMax slice"
              aria-hidden="true"
            >
              <polygon points="-8,260 58,116 120,260" fill="currentColor" opacity=".55" />
              <polygon points="58,116 120,260 152,178" fill="currentColor" opacity=".33" />
              <polygon points="120,260 152,178 212,120 252,260" fill="currentColor" opacity=".5" />
              <polygon points="152,178 212,120 204,260" fill="currentColor" opacity=".26" />
              <polygon points="42,54 60,46 55,74 37,80" fill="currentColor" opacity=".5" />
              <polygon points="55,74 37,80 49,60" fill="currentColor" opacity=".3" />
              <polygon points="192,40 210,47 203,72 185,65" fill="currentColor" opacity=".4" />
            </svg>
            @if (!isMobile()) {
              <button
                type="button"
                class="rail-toggle"
                (click)="collapsed.set(!collapsed())"
                [matTooltip]="'topbar.menu' | transloco"
                matTooltipPosition="right"
                [attr.aria-label]="'topbar.menu' | transloco"
              >
                <mat-icon>{{ collapsed() ? 'chevron_right' : 'chevron_left' }}</mat-icon>
              </button>
            }
            <nav class="railnav" [class.israil]="rail()">
              @for (n of nav; track n.path) {
                <a
                  [routerLink]="n.path"
                  routerLinkActive="active"
                  (click)="onNavClick()"
                  class="railitem"
                  [matTooltip]="rail() ? (n.label | transloco) : ''"
                  matTooltipPosition="right"
                >
                  <span class="ico"
                    ><mat-icon>{{ n.icon }}</mat-icon></span
                  >
                  <span class="lbl">{{ n.label | transloco }}</span>
                </a>
              }
              <div class="sep"></div>
              @for (n of navBottom; track n.path) {
                <a
                  [routerLink]="n.path"
                  routerLinkActive="active"
                  (click)="onNavClick()"
                  class="railitem"
                  [matTooltip]="rail() ? (n.label | transloco) : ''"
                  matTooltipPosition="right"
                >
                  <span class="ico"
                    ><mat-icon>{{ n.icon }}</mat-icon></span
                  >
                  <span class="lbl">{{ n.label | transloco }}</span>
                </a>
              }
            </nav>
          </mat-sidenav>

          <mat-sidenav-content class="main">
            <!-- Fond décoratif : nervures d'une feuille (rappel du logo « papier/feuille »), teinté par le thème -->
            <svg
              class="bg-leaf"
              viewBox="0 0 1440 620"
              preserveAspectRatio="xMidYMid slice"
              aria-hidden="true"
            >
              <g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
                <g class="v3" stroke-width="0.9">
                  <path d="M199.8 566.3 L213.3 587.9" />
                  <path d="M247.7 591.2 L260.9 613.0" />
                  <path d="M139.0 469.6 L125.8 447.7" />
                  <path d="M138.9 414.6 L125.8 392.7" />
                  <path d="M290.1 539.6 L308.1 576.9" />
                  <path d="M342.1 576.2 L357.7 614.6" />
                  <path d="M206.6 398.7 L183.4 364.5" />
                  <path d="M201.8 334.3 L177.3 300.9" />
                  <path d="M377.0 512.4 L397.1 562.7" />
                  <path d="M431.7 558.8 L446.4 611.0" />
                  <path d="M278.2 334.7 L247.0 290.4" />
                  <path d="M270.4 262.5 L236.2 220.5" />
                  <path d="M461.7 484.8 L482.4 545.9" />
                  <path d="M517.8 539.1 L530.2 602.4" />
                  <path d="M353.1 276.8 L316.2 224.0" />
                  <path d="M343.9 198.4 L302.0 149.4" />
                  <path d="M544.4 456.7 L564.9 526.2" />
                  <path d="M600.8 516.8 L610.5 588.6" />
                  <path d="M431.1 224.8 L390.4 164.9" />
                  <path d="M421.8 142.1 L374.5 87.2" />
                  <path d="M625.6 427.7 L645.4 503.3" />
                  <path d="M681.2 491.6 L688.3 569.4" />
                  <path d="M511.8 178.7 L469.2 113.2" />
                  <path d="M503.6 93.6 L453.2 33.9" />
                  <path d="M705.3 397.7 L724.2 477.0" />
                  <path d="M759.5 463.0 L764.5 544.4" />
                  <path d="M594.8 138.5 L552.3 68.9" />
                  <path d="M588.8 53.0 L537.6 -10.4" />
                  <path d="M783.8 366.2 L801.7 446.9" />
                  <path d="M835.9 430.8 L839.8 513.4" />
                  <path d="M679.8 104.4 L639.1 32.4" />
                  <path d="M677.0 20.7 L627.4 -45.5" />
                  <path d="M861.3 333.1 L878.5 412.9" />
                  <path d="M910.9 394.7 L915.0 476.2" />
                  <path d="M766.5 76.3 L729.4 3.6" />
                  <path d="M767.5 -3.6 L722.0 -71.3" />
                  <path d="M938.1 298.3 L955.0 374.6" />
                  <path d="M984.9 354.6 L990.8 432.5" />
                  <path d="M854.5 54.2 L822.6 -17.2" />
                  <path d="M860.0 -19.6 L821.2 -87.5" />
                  <path d="M1014.4 261.5 L1031.6 331.9" />
                  <path d="M1058.3 310.2 L1068.0 382.0" />
                  <path d="M943.6 37.9 L918.5 -30.0" />
                  <path d="M954.1 -27.5 L924.8 -93.8" />
                  <path d="M1090.5 222.6 L1108.8 284.4" />
                  <path d="M1131.3 261.3 L1147.4 323.7" />
                  <path d="M1033.4 27.7 L1016.7 -34.6" />
                  <path d="M1049.3 -27.2 L1033.0 -89.5" />
                  <path d="M1166.4 181.3 L1186.9 231.5" />
                  <path d="M1204.3 207.3 L1229.6 255.2" />
                  <path d="M1123.9 23.4 L1117.3 -30.3" />
                  <path d="M1145.3 -18.1 L1145.9 -72.3" />
                  <path d="M1242.2 136.5 L1265.9 170.5" />
                  <path d="M1277.1 146.1 L1310.6 170.4" />
                  <path d="M1214.8 26.2 L1220.5 -14.9" />
                  <path d="M1242.2 1.7 L1261.7 -34.9" />
                  <path d="M1312.0 92.0 L1332.0 107.7" />
                  <path d="M1335.3 88.5 L1360.6 92.1" />
                  <path d="M1298.7 34.6 L1310.1 11.8" />
                  <path d="M1321.5 27.8 L1342.9 14.0" />
                </g>
                <g class="v2" stroke-width="1.5">
                  <path d="M139.5 537.1 Q198.6 563.8 318.0 629.0" />
                  <path d="M139.5 537.1 Q138.6 472.3 139.1 333.1" />
                  <path d="M208.8 493.1 Q303.5 539.1 408.0 629.5" />
                  <path d="M208.8 493.1 Q210.4 387.9 192.2 248.8" />
                  <path d="M279.9 450.7 Q402.0 514.3 493.4 624.6" />
                  <path d="M279.9 450.7 Q285.8 313.2 253.7 173.1" />
                  <path d="M352.8 410.0 Q495.9 489.7 574.9 614.2" />
                  <path d="M352.8 410.0 Q364.4 246.6 322.6 106.2" />
                  <path d="M427.5 370.9 Q585.8 464.8 653.3 598.1" />
                  <path d="M427.5 370.9 Q445.5 187.7 398.2 48.4" />
                  <path d="M504.0 333.4 Q672.0 439.3 729.2 575.8" />
                  <path d="M504.0 333.4 Q528.7 136.5 479.9 0.1" />
                  <path d="M582.3 297.6 Q754.7 412.7 803.2 546.9" />
                  <path d="M582.3 297.6 Q613.5 92.7 567.1 -38.5" />
                  <path d="M662.4 263.5 Q834.2 384.6 875.9 511.3" />
                  <path d="M662.4 263.5 Q699.3 56.6 659.2 -66.9" />
                  <path d="M744.3 231.0 Q910.7 354.6 948.0 468.8" />
                  <path d="M744.3 231.0 Q785.7 27.9 755.5 -85.2" />
                  <path d="M828.0 200.1 Q984.5 322.3 1020.0 419.1" />
                  <path d="M828.0 200.1 Q872.4 6.6 855.5 -93.0" />
                  <path d="M913.5 170.9 Q1055.8 287.6 1092.6 362.3" />
                  <path d="M913.5 170.9 Q958.9 -7.4 958.5 -90.4" />
                  <path d="M1000.8 143.4 Q1125.0 250.1 1166.2 298.0" />
                  <path d="M1000.8 143.4 Q1044.9 -14.4 1064.1 -77.0" />
                  <path d="M1089.9 117.5 Q1192.3 209.5 1241.0 225.1" />
                  <path d="M1089.9 117.5 Q1129.9 -14.3 1172.1 -51.7" />
                  <path d="M1180.8 93.2 Q1257.5 165.2 1316.8 139.7" />
                  <path d="M1180.8 93.2 Q1213.6 -6.8 1282.7 -10.6" />
                  <path d="M1273.5 70.6 Q1319.8 115.9 1363.7 66.7" />
                  <path d="M1273.5 70.6 Q1295.0 9.4 1357.1 35.7" />
                </g>
                <path
                  class="marg"
                  d="M72.0 582.8 L127.8 607.0 L172.8 616.8 L214.7 623.1 L254.8 627.5 L293.4 630.6 L331.0 632.5 L367.5 633.5 L403.2 633.5 L438.1 632.7 L472.3 630.9 L505.8 628.3 L538.7 624.8 L571.1 620.4 L602.9 615.1 L634.2 608.7 L665.1 601.4 L695.6 593.0 L725.7 583.7 L755.5 573.2 L785.1 561.7 L814.3 549.0 L843.4 535.2 L872.3 520.3 L901.2 504.3 L929.9 487.1 L958.6 468.8 L987.2 449.3 L1016.0 428.6 L1044.8 406.8 L1073.7 383.8 L1102.7 359.5 L1131.9 334.1 L1161.3 307.3 L1190.9 279.2 L1220.7 249.6 L1250.8 218.3 L1280.9 185.0 L1311.1 148.9 L1341.1 108.2 L1368.0 49.6"
                  stroke-width="1.3"
                />
                <path
                  class="marg"
                  d="M72.0 582.8 L69.7 521.7 L79.0 475.5 L91.7 433.2 L107.0 393.5 L124.2 355.6 L143.1 319.4 L163.6 284.7 L185.5 251.4 L208.7 219.5 L233.3 189.0 L259.1 159.9 L286.1 132.3 L314.2 106.1 L343.5 81.4 L373.8 58.2 L405.1 36.5 L437.4 16.3 L470.6 -2.3 L504.7 -19.3 L539.7 -34.7 L575.5 -48.4 L612.1 -60.5 L649.4 -71.0 L687.5 -79.7 L726.1 -86.8 L765.4 -92.3 L805.3 -96.0 L845.7 -98.1 L886.6 -98.4 L927.9 -97.0 L969.7 -93.9 L1011.9 -89.0 L1054.5 -82.4 L1097.5 -73.8 L1140.9 -63.2 L1184.6 -50.5 L1228.7 -35.1 L1273.4 -16.4 L1318.9 7.4 L1368.0 49.6"
                  stroke-width="1.3"
                />
                <path class="midrib" d="M72.0 582.8 Q604.8 210.8 1368.0 49.6" stroke-width="2.6" />
              </g>
            </svg>
            <div class="content" id="main-content" #scrollContent><router-outlet /></div>
          </mat-sidenav-content>
        </mat-sidenav-container>
      </div>
    }

    @if (toast.message(); as t) {
      <div
        class="toast"
        role="status"
        aria-live="polite"
        [class.error]="t.kind === 'error'"
        [class.success]="t.kind === 'success'"
      >
        <mat-icon class="ti">{{
          t.kind === 'error' ? 'error' : t.kind === 'success' ? 'check_circle' : 'info'
        }}</mat-icon>
        <span class="tt">{{ t.text }}</span>
        <button class="tc" (click)="toast.dismiss()" aria-label="Fermer">
          <mat-icon>close</mat-icon>
        </button>
      </div>
    }
  `,
  styles: [
    `
      /* Coquille : barre en haut (pleine largeur) puis conteneur en dessous */
      .app-shell {
        height: 100vh;
        display: flex;
        flex-direction: column;
        background: var(--mat-sys-surface-container-low, #f4f5fb);
      }

      /* Barre supérieure pleine largeur */
      .topbar {
        flex: none;
        z-index: 20;
        gap: 0.1rem;
        height: 60px;
        background: color-mix(in srgb, var(--mat-sys-surface) 90%, var(--mat-sys-primary) 4%);
        backdrop-filter: blur(10px);
        border-bottom: 1px solid var(--mat-sys-outline-variant);
      }
      .topbar .brand {
        display: inline-flex;
        align-items: center;
        gap: 0.55rem;
        margin-left: 0.25rem;
        text-decoration: none;
      }
      .topbar .brand:hover {
        text-decoration: none;
      }
      .topbar .brand .logo {
        width: 34px;
        height: 34px;
        flex: none;
        display: grid;
        place-items: center;
      }
      .topbar .brand .logo img {
        width: 100%;
        height: 100%;
        display: block;
      }
      .topbar .brand .brandtext {
        display: flex;
        flex-direction: column;
        line-height: 1.05;
      }
      .topbar .brand strong {
        color: var(--mat-sys-on-surface);
        font-family: var(--pd-display);
        letter-spacing: var(--pd-display-track);
        font-size: 1.05rem;
      }
      .topbar .brand .tag {
        color: var(--mat-sys-on-surface-variant);
        font-size: 0.6rem;
        text-transform: uppercase;
        letter-spacing: 0.16em;
        margin-top: 0.12rem;
      }
      @media (max-width: 560px) {
        .topbar .brand .brandtext {
          display: none;
        }
      }
      .grow {
        flex: 1;
      }

      /* Conteneur (sidenav + contenu) sous la barre, occupe le reste de la hauteur */
      .shell {
        flex: 1 1 auto;
        min-height: 0;
        background: var(--mat-sys-surface-container-low, #f4f5fb);
      }
      /* Fond du contenu : voiles de couleur du thème + nervures de feuille (SVG inline, teinté par le thème) */
      .main {
        position: relative;
        background:
          radial-gradient(
            1200px 620px at 78% 30%,
            color-mix(in srgb, var(--mat-sys-primary) 9%, transparent),
            transparent 60%
          ),
          radial-gradient(
            1000px 520px at 8% -8%,
            color-mix(in srgb, var(--mat-sys-tertiary) 7%, transparent),
            transparent 55%
          ),
          var(--mat-sys-surface);
      }
      /* Nervures de feuille : dessin vectoriel intégré, couleur = accent du thème */
      .bg-leaf {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        color: var(--mat-sys-primary);
        opacity: 0.16;
        pointer-events: none;
        z-index: 0;
      }
      .bg-leaf .v3 {
        opacity: 0.5;
      }
      .bg-leaf .marg {
        opacity: 0.75;
      }
      :root.dark .bg-leaf {
        opacity: 0.24;
      }

      /* ===== Sidenav original, collé au thème, avec motif « papier plié » ===== */
      .nav {
        width: 244px;
        overflow: hidden;
        color: var(--mat-sys-on-surface);
        border: none !important;
        border-right: 1px solid var(--mat-sys-outline-variant) !important;
        background: linear-gradient(
          180deg,
          color-mix(in srgb, var(--mat-sys-primary) 8%, var(--mat-sys-surface-container)) 0%,
          var(--mat-sys-surface-container-low) 46%
        ) !important;
        transition: width 0.18s ease;
      }
      .nav.rail {
        width: 72px;
      }
      .nav-motif {
        position: absolute;
        left: 0;
        right: 0;
        bottom: 0;
        width: 100%;
        height: 58%;
        color: var(--mat-sys-primary);
        opacity: 0.13;
        pointer-events: none;
        z-index: 0;
      }
      /* Bouton de réduction : flèche sur le côté (bord droit) de la sidebar */
      .rail-toggle {
        position: absolute;
        top: 50%;
        right: 0px;
        transform: translateY(-50%);
        z-index: 3;
        width: 28px;
        padding: 0;
        height: 28px;
        border-radius: 50%;
        border: 1px solid var(--mat-sys-outline-variant);
        background: var(--mat-sys-surface-container-lowest);
        color: var(--mat-sys-on-surface-variant);
        display: grid;
        place-items: center;
        cursor: pointer;
        box-shadow: var(--shadow-xs);
        transition:
          background 0.14s ease,
          color 0.14s ease,
          border-color 0.14s ease,
          box-shadow 0.14s ease;
      }
      .rail-toggle:hover {
        color: var(--mat-sys-primary);
        border-color: var(--mat-sys-primary);
        box-shadow: var(--shadow);
      }
      .rail-toggle mat-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
      }

      /* Navigation rail / drawer (Material 3) */
      .railnav {
        position: relative;
        z-index: 1;
        display: flex;
        flex-direction: column;
        gap: 0.2rem;
        padding: 0.9rem 0.55rem;
      }
      .railitem {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 0.4rem 0.5rem;
        border-radius: var(--pd-r-btn);
        color: var(--mat-sys-on-surface-variant);
        text-decoration: none;
        transition:
          background 0.14s ease,
          color 0.14s ease;
      }
      .railitem:hover {
        background: color-mix(in srgb, var(--mat-sys-on-surface) 5%, transparent);
        text-decoration: none;
      }
      .railitem .ico {
        display: grid;
        place-items: center;
        width: 46px;
        height: 40px;
        border-radius: 999px;
        flex: none;
        transition: background 0.16s ease;
      }
      .railitem .ico mat-icon {
        font-size: 24px;
        width: 24px;
        height: 24px;
        line-height: 24px;
        color: var(--mat-sys-on-surface-variant);
      }
      .railitem .lbl {
        font-weight: 600;
        font-size: 0.92rem;
        white-space: nowrap;
      }
      .railitem.active {
        color: var(--mat-sys-on-secondary-container);
      }
      .railitem.active .ico {
        background: var(--mat-sys-secondary-container);
      }
      .railitem.active .ico mat-icon {
        color: var(--mat-sys-on-secondary-container);
      }
      /* Mode rail : icônes centrées, empilées sur un petit libellé */
      .railnav.israil {
        padding: 0.9rem 0.35rem;
      }
      .railnav.israil .railitem {
        flex-direction: column;
        gap: 0.15rem;
        padding: 0.45rem 0;
      }
      .railnav.israil .railitem .ico {
        width: 100%;
      }
      .railnav.israil .railitem .lbl {
        font-size: 0.6rem;
        font-weight: 600;
        opacity: 0.9;
      }
      .sep {
        height: 1px;
        background: var(--mat-sys-outline-variant);
        margin: 0.55rem 0.8rem;
      }

      /* Menu de thème */
      .tm-head {
        padding: 0.4rem 1rem 0.2rem;
        font-size: 0.68rem;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: var(--mat-sys-on-surface-variant);
        font-weight: 700;
      }
      .tm-dot {
        width: 14px;
        height: 14px;
        border-radius: 50%;
        margin-right: 0.6rem;
        box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.15);
      }
      .tm-name {
        font-weight: 600;
      }
      .tm-sub {
        margin-left: 0.5rem;
        color: var(--mat-sys-on-surface-variant);
        font-size: 0.75rem;
      }
      .tm-check {
        margin-left: auto;
        color: var(--mat-sys-primary);
      }
      .tm-modes {
        display: flex;
        gap: 0.3rem;
        padding: 0.2rem 0.8rem 0.6rem;
      }
      .tm-modes button {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.2rem;
        border: 1px solid var(--mat-sys-outline-variant);
        background: transparent;
        color: var(--mat-sys-on-surface-variant);
        border-radius: var(--pd-r-s);
        padding: 0.4rem;
        cursor: pointer;
        font-size: 0.72rem;
      }
      .tm-modes button mat-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
      }
      .tm-modes button.on {
        background: var(--mat-sys-secondary-container);
        color: var(--mat-sys-on-secondary-container);
        border-color: transparent;
      }

      .userbtn {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        flex-wrap: nowrap;
        white-space: nowrap;
        height: 42px;
        padding: 0 0.35rem 0 0.45rem;
        border: none;
        background: transparent;
        cursor: pointer;
        color: var(--mat-sys-on-surface);
        font: inherit;
        border-radius: 999px;
        transition: background 0.14s ease;
      }
      .userbtn:hover {
        background: color-mix(in srgb, var(--mat-sys-on-surface) 6%, transparent);
      }
      .userbtn .ucaret {
        flex: none;
        color: var(--mat-sys-on-surface-variant);
        font-size: 22px;
        width: 22px;
        height: 22px;
      }
      .avatar {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        flex: none;
        display: grid;
        place-items: center;
        color: var(--mat-sys-on-primary);
        font-weight: 700;
        font-size: 0.78rem;
        text-transform: uppercase;
        background: linear-gradient(
          135deg,
          var(--brand, var(--mat-sys-primary)),
          var(--mat-sys-tertiary)
        );
      }
      .uname {
        font-weight: 600;
        max-width: 180px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      @media (max-width: 640px) {
        .uname {
          display: none;
        }
      }
      .menuhead {
        padding: 0.6rem 1rem;
        border-bottom: 1px solid var(--mat-sys-outline-variant);
      }
      .menuhead .mn {
        font-weight: 700;
      }
      .menuhead .mr {
        font-size: 0.75rem;
        color: var(--mat-sys-outline);
        text-transform: capitalize;
      }

      .content {
        position: relative;
        z-index: 1;
        padding: 1.8rem 2.2rem;
        max-width: 1240px;
        margin: 0 auto;
        width: 100%;
      }
      @media (max-width: 700px) {
        .content {
          padding: 1rem;
        }
      }

      .toast {
        position: fixed;
        bottom: 1.4rem;
        right: 1.4rem;
        z-index: 1000;
        background: #0f172a;
        color: #fff;
        padding: 0.7rem 0.8rem 0.7rem 1rem;
        border-radius: 12px;
        box-shadow: 0 18px 44px rgba(0, 0, 0, 0.3);
        display: flex;
        align-items: center;
        gap: 0.6rem;
        max-width: 420px;
      }
      .toast.error {
        background: #dc2626;
      }
      .toast.success {
        background: #16a34a;
      }
      .toast .ti {
        font-size: 20px;
        width: 20px;
        height: 20px;
        flex: none;
      }
      .toast .tt {
        flex: 1;
        line-height: 1.35;
      }
      .toast .tc {
        background: transparent;
        border: none;
        color: inherit;
        opacity: 0.8;
        cursor: pointer;
        display: grid;
        place-items: center;
        padding: 2px;
        border-radius: 6px;
      }
      .toast .tc:hover {
        opacity: 1;
        background: rgba(255, 255, 255, 0.15);
      }
      .toast .tc mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
      }

      /* Barre de progression de navigation (chargement de route / chunk) */
      .route-progress {
        position: relative;
        flex: none;
        height: 3px;
        z-index: 6;
        background: color-mix(in srgb, var(--mat-sys-primary) 18%, transparent);
        overflow: hidden;
      }
      .route-progress span {
        position: absolute;
        height: 100%;
        width: 40%;
        background: var(--mat-sys-primary);
        border-radius: 3px;
        animation: route-slide 1.1s ease-in-out infinite;
      }
      @keyframes route-slide {
        0% {
          left: -40%;
        }
        50% {
          left: 30%;
        }
        100% {
          left: 100%;
        }
      }

      /* Lien d'évitement (accessibilité clavier) */
      .skip-link {
        position: fixed;
        left: 12px;
        top: -60px;
        z-index: 2000;
        background: var(--mat-sys-primary);
        color: var(--mat-sys-on-primary);
        padding: 0.55rem 1rem;
        border-radius: 8px;
        font-weight: 700;
        transition: top 0.18s ease;
      }
      .skip-link:focus {
        top: 12px;
        text-decoration: none;
      }
    `,
  ],
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
