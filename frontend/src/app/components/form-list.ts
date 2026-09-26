import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { FormService } from '@core/services/form.service';
import { ToastService } from '@core/services/api.service';
import { OnlineForm } from '@core/models';

@Component({
  selector: 'app-form-list',
  imports: [RouterLink, TranslocoModule],
  template: `
    <div class="row between">
      <h1>{{ 'forms.title' | transloco }}</h1>
      <a class="btn btn-primary" routerLink="/forms/new">+ {{ 'forms.new' | transloco }}</a>
    </div>
    <p class="muted">{{ 'forms.subtitle' | transloco }}</p>

    @if (forms().length) {
      <div class="grid-cards">
        @for (f of forms(); track f.id) {
          <div class="card">
            <div class="row between">
              <strong>{{ f.title }}</strong>
              <span class="badge" [class]="'badge-' + f.confidentiality">{{ f.confidentialityDisplay }}</span>
            </div>
            <p class="muted" style="min-height:2.4em">{{ f.description }}</p>
            <div class="linkbox">
              <input readonly [value]="f.shortUrl" #urlInput />
              <button class="btn btn-sm btn-ghost" (click)="copy(f.shortUrl!)">{{ 'forms.copy' | transloco }}</button>
            </div>
            <div class="row between" style="margin-top:.6rem">
              <span class="tag">
                {{ (f.isOpen ? 'forms.open' : 'forms.closed') | transloco }} · {{ 'forms.responses' | transloco: { count: f.submissionCount } }}
              </span>
              <a class="btn btn-sm btn-ghost" [routerLink]="['/forms', f.id]">{{ 'forms.manage' | transloco }}</a>
            </div>
          </div>
        }
      </div>
    } @else {
      <div class="empty">{{ 'forms.empty' | transloco }}</div>
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
  private t = inject(TranslocoService);

  forms = signal<OnlineForm[]>([]);

  constructor() {
    this.service.list().subscribe((r) => this.forms.set(r.results));
  }

  copy(url: string) {
    navigator.clipboard?.writeText(url);
    this.toast.success(this.t.translate('forms.copied'));
  }
}
