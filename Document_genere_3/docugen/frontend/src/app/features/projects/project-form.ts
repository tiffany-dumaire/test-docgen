import { Component, inject, signal, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgTemplateOutlet } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { ProjectService } from '../../core/services/project.service';
import { ToastService } from '../../core/services/api.service';
import { Contact, ContactKind, Project } from '../../core/models';

@Component({
  selector: 'app-project-form',
  imports: [FormsModule, RouterLink, NgTemplateOutlet],
  template: `
    <div class="row between">
      <h1>{{ isEdit() ? 'Modifier le projet' : 'Nouveau projet' }}</h1>
      <a class="btn btn-ghost" routerLink="/projects">Retour</a>
    </div>

    @if (model(); as m) {
      <div class="card stack">
        <div class="form-grid">
          <div class="field">
            <label>Nom du projet *</label>
            <input [(ngModel)]="m.name" />
          </div>
          <div class="field">
            <label>Nom du client *</label>
            <input [(ngModel)]="m.client_name" />
          </div>
        </div>
        <div class="form-grid">
          <div class="field">
            <label>Référence interne</label>
            <input [(ngModel)]="m.reference" placeholder="PRJ-2026-001" />
          </div>
          <div class="field">
            <label>Statut</label>
            <select [(ngModel)]="m.status">
              <option value="active">Actif</option>
              <option value="on_hold">En pause</option>
              <option value="archived">Archivé</option>
            </select>
          </div>
        </div>
        <div class="field">
          <label>Description</label>
          <textarea [(ngModel)]="m.description" rows="3"></textarea>
        </div>

        <div class="field">
          <div class="row between">
            <label>👤 Contacts client</label>
            <button class="btn btn-sm btn-ghost" (click)="addContact('client')">+ Ajouter</button>
          </div>
          @for (c of clientContacts(); track c) {
            <ng-container *ngTemplateOutlet="contactRow; context: { $implicit: c }"></ng-container>
          }
        </div>

        <div class="field">
          <div class="row between">
            <label>🧑‍💼 Contacts internes</label>
            <button class="btn btn-sm btn-ghost" (click)="addContact('internal')">+ Ajouter</button>
          </div>
          @for (c of internalContacts(); track c) {
            <ng-container *ngTemplateOutlet="contactRow; context: { $implicit: c }"></ng-container>
          }
        </div>

        <div class="row">
          <button class="btn btn-primary" (click)="save()" [disabled]="saving()">
            {{ isEdit() ? 'Enregistrer' : 'Créer le projet' }}
          </button>
        </div>
      </div>
    }

    <ng-template #contactRow let-c>
      <div class="contact-row">
        <input [(ngModel)]="c.first_name" placeholder="Prénom" />
        <input [(ngModel)]="c.last_name" placeholder="Nom" />
        <input [(ngModel)]="c.role" placeholder="Fonction" />
        <input [(ngModel)]="c.email" placeholder="Email" />
        <input [(ngModel)]="c.phone" placeholder="Téléphone" />
        <button class="btn btn-sm btn-danger" (click)="removeContact(c)">✕</button>
      </div>
    </ng-template>
  `,
  styles: [
    `
      .contact-row {
        display: grid;
        grid-template-columns: 1fr 1fr 1fr 1.3fr 1fr auto;
        gap: 0.4rem;
        margin-bottom: 0.4rem;
      }
    `,
  ],
})
export class ProjectForm {
  private service = inject(ProjectService);
  private toast = inject(ToastService);
  private router = inject(Router);

  @Input() id?: string;
  model = signal<Project | null>(null);
  saving = signal(false);

  constructor() {
    setTimeout(() => {
      if (this.id) {
        this.service.get(+this.id).subscribe((p) => this.model.set(p));
      } else {
        this.model.set({
          name: '',
          client_name: '',
          description: '',
          reference: '',
          status: 'active',
          contacts: [],
        });
      }
    });
  }

  isEdit() {
    return !!this.id;
  }

  clientContacts() {
    return this.model()?.contacts.filter((c) => c.kind === 'client') ?? [];
  }
  internalContacts() {
    return this.model()?.contacts.filter((c) => c.kind === 'internal') ?? [];
  }

  addContact(kind: ContactKind) {
    const m = this.model();
    if (!m) return;
    m.contacts.push({
      kind,
      first_name: '',
      last_name: '',
      role: '',
      email: '',
      phone: '',
    });
    this.model.set({ ...m });
  }

  removeContact(c: Contact) {
    const m = this.model();
    if (!m) return;
    m.contacts = m.contacts.filter((x) => x !== c);
    this.model.set({ ...m });
  }

  save() {
    const m = this.model();
    if (!m) return;
    if (!m.name || !m.client_name) {
      this.toast.error('Nom du projet et du client obligatoires.');
      return;
    }
    this.saving.set(true);
    const req = this.isEdit()
      ? this.service.update(+this.id!, m)
      : this.service.create(m);
    req.subscribe({
      next: (p) => {
        this.toast.success('Projet enregistré.');
        this.router.navigate(['/projects', p.id]);
      },
      error: () => {
        this.saving.set(false);
        this.toast.error("Erreur lors de l'enregistrement.");
      },
    });
  }
}
