import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CompanyService } from '../../core/services/company.service';
import { ToastService } from '../../core/services/api.service';
import { CompanyProfile, UsefulLink } from '../../core/models';

@Component({
  selector: 'app-company-settings',
  imports: [FormsModule],
  template: `
    <div class="row between">
      <h1>Mon entreprise</h1>
      <button class="btn btn-primary" (click)="save()" [disabled]="saving()">
        Enregistrer
      </button>
    </div>
    <p class="muted">
      Ces informations apparaissent dans l'en-tête et le pied de page de tous
      les documents générés.
    </p>

    @if (model(); as m) {
      <div class="card stack">
        <div class="form-grid">
          <div class="field">
            <label>Nom *</label>
            <input [(ngModel)]="m.name" placeholder="Nom de l'entreprise" />
          </div>
          <div class="field">
            <label>Email de contact</label>
            <input [(ngModel)]="m.email" type="email" placeholder="contact@..." />
          </div>
        </div>

        <div class="field">
          <label>Description</label>
          <textarea [(ngModel)]="m.description" rows="2"></textarea>
        </div>

        <div class="field">
          <label>Logo</label>
          @if (m.logo_url) {
            <div class="row" style="margin-bottom: .5rem">
              <img [src]="m.logo_url" alt="logo" style="height: 48px" />
            </div>
          }
          <input type="file" accept="image/*" (change)="onLogo($event)" />
          <small>PNG/JPG. Utilisé dans les documents.</small>
        </div>

        <div class="form-grid">
          <div class="field">
            <label>Site web</label>
            <input [(ngModel)]="m.website_url" placeholder="https://..." />
          </div>
          <div class="field">
            <label>Conditions générales (URL)</label>
            <input [(ngModel)]="m.terms_url" placeholder="https://.../cgv" />
          </div>
        </div>

        <div class="form-grid">
          <div class="field">
            <label>Téléphone</label>
            <input [(ngModel)]="m.phone" />
          </div>
          <div class="field">
            <label>Adresse</label>
            <textarea [(ngModel)]="m.address" rows="2"></textarea>
          </div>
        </div>

        <div class="field">
          <div class="row between">
            <label>Liens utiles</label>
            <button class="btn btn-sm btn-ghost" (click)="addLink(m)">+ Ajouter</button>
          </div>
          @for (link of m.useful_links; track $index) {
            <div class="row" style="margin-bottom: .5rem">
              <input [(ngModel)]="link.label" placeholder="Libellé" style="flex:1" />
              <input [(ngModel)]="link.url" placeholder="https://..." style="flex:2" />
              <button class="btn btn-sm btn-danger" (click)="removeLink(m, $index)">✕</button>
            </div>
          }
          @if (!m.useful_links.length) {
            <small>Aucun lien. Cliquez sur « Ajouter ».</small>
          }
        </div>
      </div>
    }
  `,
})
export class CompanySettings {
  private service = inject(CompanyService);
  private toast = inject(ToastService);

  model = signal<CompanyProfile | null>(null);
  saving = signal(false);
  private logoFile: File | null = null;

  constructor() {
    this.service.get().subscribe((c) => this.model.set(c));
  }

  addLink(m: CompanyProfile) {
    m.useful_links.push({ label: '', url: '', order: m.useful_links.length });
  }
  removeLink(m: CompanyProfile, i: number) {
    m.useful_links.splice(i, 1);
  }

  onLogo(event: Event) {
    const input = event.target as HTMLInputElement;
    this.logoFile = input.files?.[0] ?? null;
  }

  save() {
    const m = this.model();
    if (!m) return;
    this.saving.set(true);

    if (this.logoFile) {
      const fd = new FormData();
      fd.append('name', m.name);
      fd.append('description', m.description ?? '');
      fd.append('website_url', m.website_url ?? '');
      fd.append('terms_url', m.terms_url ?? '');
      fd.append('address', m.address ?? '');
      fd.append('phone', m.phone ?? '');
      fd.append('email', m.email ?? '');
      fd.append('logo', this.logoFile);
      this.service.updateWithLogo(fd).subscribe({
        next: (c) => this.done(c),
        error: () => this.fail(),
      });
    } else {
      this.service.update(m).subscribe({
        next: (c) => this.done(c),
        error: () => this.fail(),
      });
    }
  }

  private done(c: CompanyProfile) {
    this.model.set(c);
    this.logoFile = null;
    this.saving.set(false);
    this.toast.success('Profil entreprise enregistré.');
  }
  private fail() {
    this.saving.set(false);
    this.toast.error("Erreur lors de l'enregistrement.");
  }
}
