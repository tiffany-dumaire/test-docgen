import { Component, inject, signal, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgTemplateOutlet } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { ProjectService } from '../../core/services/project.service';
import { ClientService } from '../../core/services/client.service';
import { TeamService } from '../../core/services/company.service';
import { ToastService } from '../../core/services/api.service';
import { Client, Contact, ContactKind, Project, Team, TeamMember } from '../../core/models';

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
            <label>Fiche client (optionnel)</label>
            <select [ngModel]="m.client ?? null" (ngModelChange)="onClientChange($event, m)">
              <option [ngValue]="null">— Aucune —</option>
              @for (cl of clients(); track cl.id) { <option [ngValue]="cl.id">{{ cl.name }}</option> }
            </select>
            <small class="muted">Rattacher ce projet à un client existant (menu Clients).</small>
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
        <div class="form-grid">
          <div class="field">
            <label>Date de début</label>
            <input type="date" [ngModel]="m.start_date" (ngModelChange)="m.start_date = $event || null" />
          </div>
          <div class="field">
            <label>Date de fin prévue</label>
            <input type="date" [ngModel]="m.end_date" (ngModelChange)="m.end_date = $event || null" />
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

        <div class="field">
          <div class="row between">
            <label>🛠️ Équipe de développement</label>
            <button class="btn btn-sm btn-ghost" (click)="addAssignment()" [disabled]="!allMembers().length">+ Affecter un membre</button>
          </div>
          @if (!allMembers().length) {
            <small class="muted">Aucun membre d'équipe. Créez des équipes dans le menu « Équipes ».</small>
          }
          @for (a of m.assignments ?? []; track $index) {
            <div class="row" style="gap:.4rem; margin-bottom:.3rem">
              <select [(ngModel)]="a.member" style="flex:2">
                @for (mem of allMembers(); track mem.id) {
                  <option [ngValue]="mem.id">{{ mem.full_name }} @if (mem.teamName) { — {{ mem.teamName }} }</option>
                }
              </select>
              <input [(ngModel)]="a.role" placeholder="Rôle sur le projet" style="flex:1" />
              <button class="btn btn-sm btn-danger" (click)="m.assignments!.splice($index, 1)">✕</button>
            </div>
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
  private clientService = inject(ClientService);
  private teamService = inject(TeamService);
  private toast = inject(ToastService);
  private router = inject(Router);

  @Input() id?: string;
  model = signal<Project | null>(null);
  saving = signal(false);
  clients = signal<Client[]>([]);
  allMembers = signal<(TeamMember & { teamName?: string })[]>([]);

  constructor() {
    this.clientService.list().subscribe((r) => this.clients.set(r.results));
    this.teamService.teams().subscribe((r) => {
      const flat: (TeamMember & { teamName?: string })[] = [];
      for (const t of r.results) {
        for (const mem of t.members) flat.push({ ...mem, teamName: t.name });
      }
      this.allMembers.set(flat);
    });
    setTimeout(() => {
      if (this.id) {
        this.service.get(+this.id).subscribe((p) => {
          if (!p.assignments) p.assignments = [];
          this.model.set(p);
        });
      } else {
        this.model.set({
          name: '',
          client_name: '',
          description: '',
          reference: '',
          status: 'active',
          contacts: [],
          assignments: [],
        });
      }
    });
  }

  isEdit() {
    return !!this.id;
  }

  onClientChange(clientId: number | null, m: Project) {
    m.client = clientId;
    if (clientId) {
      const cl = this.clients().find((c) => c.id === clientId);
      if (cl && !m.client_name) m.client_name = cl.name;
    }
  }

  addAssignment() {
    const m = this.model();
    if (!m) return;
    m.assignments = m.assignments ?? [];
    const first = this.allMembers()[0];
    m.assignments.push({ member: first?.id ?? 0, role: '' });
    this.model.set({ ...m });
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
