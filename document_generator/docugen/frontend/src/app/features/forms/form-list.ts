import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormService } from '../../core/services/form.service';
import { ToastService } from '../../core/services/api.service';
import { OnlineForm } from '../../core/models';

@Component({
  selector: 'app-form-list',
  imports: [RouterLink],
  template: `
    <div class="row between">
      <h1>Formulaires en ligne</h1>
      <a class="btn btn-primary" routerLink="/forms/new">+ Nouveau formulaire</a>
    </div>
    <p class="muted">
      Créez des formulaires partageables via un lien réduit et collectez les réponses.
    </p>

    @if (forms().length) {
      <div class="grid-cards">
        @for (f of forms(); track f.id) {
          <div class="card">
            <div class="row between">
              <strong>{{ f.title }}</strong>
              <span class="badge" [class]="'badge-' + f.confidentiality">{{ f.confidentiality_display }}</span>
            </div>
            <p class="muted" style="min-height:2.4em">{{ f.description }}</p>
            <div class="linkbox">
              <input readonly [value]="f.short_url" #urlInput />
              <button class="btn btn-sm btn-ghost" (click)="copy(f.short_url!)">Copier</button>
            </div>
            <div class="row between" style="margin-top:.6rem">
              <span class="tag">
                {{ f.is_open ? '🟢 Ouvert' : '🔴 Fermé' }} · {{ f.submission_count }} réponse(s)
              </span>
              <a class="btn btn-sm btn-ghost" [routerLink]="['/forms', f.id]">Gérer</a>
            </div>
          </div>
        }
      </div>
    } @else {
      <div class="empty">Aucun formulaire. Créez-en un pour commencer.</div>
    }
  `,
  styles: [
    `
      .linkbox { display: flex; gap: 0.4rem; }
      .linkbox input { font-size: 0.78rem; font-family: ui-monospace, monospace; }
    `,
  ],
})
export class FormList {
  private service = inject(FormService);
  private toast = inject(ToastService);

  forms = signal<OnlineForm[]>([]);

  constructor() {
    this.service.list().subscribe((r) => this.forms.set(r.results));
  }

  copy(url: string) {
    navigator.clipboard?.writeText(url);
    this.toast.success('Lien copié.');
  }
}
