import { Directive, HostListener, Input, Injectable, inject } from '@angular/core';
import { Location } from '@angular/common';
import { Router, NavigationEnd } from '@angular/router';

/**
 * Suit le nombre de navigations internes depuis le démarrage de l'application,
 * pour savoir si un « retour arrière » reste dans l'application.
 * Injecté tôt (dans App) afin de compter dès la première page.
 */
@Injectable({ providedIn: 'root' })
export class NavHistoryService {
  private count = 0;
  constructor(router: Router) {
    router.events.subscribe((e) => {
      if (e instanceof NavigationEnd) this.count++;
    });
  }
  /** Vrai s'il existe une page précédente dans l'application. */
  canGoBack(): boolean { return this.count > 1; }
}

/**
 * Bouton « Retour » : ramène à la page réellement affichée avant la vue
 * courante (historique du navigateur). En l'absence d'historique interne
 * (accès direct par lien), retombe sur la route de repli fournie.
 *
 *   <button class="btn btn-ghost" appBack="/documents">Retour</button>
 */
@Directive({ selector: '[appBack]' })
export class BackDirective {
  @Input('appBack') fallback = '';
  private location = inject(Location);
  private router = inject(Router);
  private hist = inject(NavHistoryService);

  @HostListener('click', ['$event'])
  onClick(event: Event) {
    event.preventDefault();
    if (this.hist.canGoBack()) this.location.back();
    else this.router.navigateByUrl(this.fallback || '/dashboard');
  }
}
