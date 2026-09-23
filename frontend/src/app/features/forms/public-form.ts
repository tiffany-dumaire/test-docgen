import { Component, inject, signal, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FormService } from '../../core/services/form.service';
import { OnlineForm } from '../../core/models';

@Component({
  selector: 'app-public-form',
  imports: [FormsModule],
  template: `
    <div class="public-wrap">
      <div class="public-card">
        @if (loading()) {
          <p class="muted">Chargement…</p>
        } @else if (notFound()) {
          <h2>Formulaire introuvable</h2>
          <p class="muted">Ce lien n'est pas valide ou a expiré.</p>
        } @else if (submitted()) {
          <div class="success">
            <div class="check">✓</div>
            <h2>Merci !</h2>
            <p>{{ successMessage() }}</p>
          </div>
        } @else if (form(); as f) {
          <h2>{{ f.title }}</h2>
          @if (f.description) { <p class="muted">{{ f.description }}</p> }

          @if (!f.is_open) {
            <p class="closed">Ce formulaire n'accepte plus de réponses.</p>
          } @else {
            <div class="stack">
              @for (field of f.schema; track field.key) {
                <div class="field">
                  <label>{{ field.label }} @if (field.required) { <span class="req">*</span> }</label>
                  @switch (field.type) {
                    @case ('textarea') {
                      <textarea [ngModel]="value(field.key)" (ngModelChange)="setValue(field.key, $event)" rows="3"></textarea>
                    }
                    @case ('select') {
                      <select [ngModel]="value(field.key)" (ngModelChange)="setValue(field.key, $event)">
                        <option value="">—</option>
                        @for (opt of field.options ?? []; track opt) { <option [value]="opt">{{ opt }}</option> }
                      </select>
                    }
                    @case ('checkbox') {
                      <label class="row" style="gap:.5rem; font-weight:400">
                        <input type="checkbox" style="width:auto"
                          [ngModel]="value(field.key) === 'true'"
                          (ngModelChange)="setValue(field.key, $event ? 'true' : 'false')" />
                        Oui
                      </label>
                    }
                    @default {
                      <input
                        [type]="field.type === 'number' ? 'number' : (field.type === 'email' ? 'email' : (field.type === 'date' ? 'date' : 'text'))"
                        [ngModel]="value(field.key)"
                        (ngModelChange)="setValue(field.key, $event)"
                      />
                    }
                  }
                </div>
              }
              @if (error()) { <p class="err">{{ error() }}</p> }
              <button class="btn btn-primary" (click)="submit()" [disabled]="sending()">
                Envoyer
              </button>
            </div>
          }
        }
      </div>
      <div class="footer muted">Propulsé par DocuGen</div>
    </div>
  `,
  styles: [
    `
      .public-wrap {
        min-height: 100vh;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        background: var(--bg);
        padding: 2rem 1rem;
      }
      .public-card {
        background: #fff;
        border: 1px solid var(--border);
        border-radius: 14px;
        box-shadow: var(--shadow-lg);
        padding: 2rem;
        width: 560px;
        max-width: 100%;
      }
      .req { color: var(--danger); }
      .err { color: var(--danger); }
      .closed { color: var(--warning); font-weight: 600; }
      .success { text-align: center; padding: 1.5rem 0; }
      .check {
        width: 56px; height: 56px; border-radius: 50%;
        background: var(--success); color: #fff; font-size: 1.8rem;
        display: flex; align-items: center; justify-content: center;
        margin: 0 auto 1rem;
      }
      .footer { margin-top: 1.5rem; font-size: 0.8rem; }
    `,
  ],
})
export class PublicForm {
  private service = inject(FormService);

  @Input() code!: string;

  form = signal<OnlineForm | null>(null);
  loading = signal(true);
  notFound = signal(false);
  submitted = signal(false);
  sending = signal(false);
  error = signal('');
  successMessage = signal('');

  private data: Record<string, string> = {};

  constructor() {
    setTimeout(() => {
      this.service.publicForm(this.code).subscribe({
        next: (f) => {
          this.form.set(f);
          this.successMessage.set(f.success_message);
          this.loading.set(false);
        },
        error: () => {
          this.notFound.set(true);
          this.loading.set(false);
        },
      });
    });
  }

  value(key: string): string {
    return this.data[key] ?? '';
  }
  setValue(key: string, v: string) {
    this.data[key] = v;
  }

  submit() {
    const f = this.form();
    if (!f) return;
    const missing = f.schema.filter((x) => x.required && !this.data[x.key]?.trim());
    if (missing.length) {
      this.error.set('Champs obligatoires : ' + missing.map((x) => x.label).join(', '));
      return;
    }
    this.error.set('');
    this.sending.set(true);
    this.service.submit(this.code, this.data).subscribe({
      next: (r) => {
        this.sending.set(false);
        this.successMessage.set(r.detail);
        this.submitted.set(true);
      },
      error: (e) => {
        this.sending.set(false);
        this.error.set(e?.error?.detail ?? "Erreur lors de l'envoi.");
      },
    });
  }
}
