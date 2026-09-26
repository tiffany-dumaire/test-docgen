import { Component, inject, signal, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgTemplateOutlet } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { ProjectService } from '../../core/services/project.service';
import { ClientService } from '../../core/services/client.service';
import { TeamService } from '../../core/services/company.service';
import { StyleEditor } from '../documents/style-editor';
import { ToastService } from '../../core/services/api.service';
import { Client, Contact, ContactKind, Project, Team, TeamMember } from '../../core/models';

@Component({
  selector: 'app-project-form',
  imports: [FormsModule, RouterLink, NgTemplateOutlet, StyleEditor],
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
            <label>Projet parent (arborescence)</label>
            <select [ngModel]="m.parent ?? null" (ngModelChange)="m.parent = $event">
              <option [ngValue]="null">— Aucun (projet racine) —</option>
              @for (pr of allProjects(); track pr.id) {
                @if (pr.id !== +(id || 0)) { <option [ngValue]="pr.id">{{ pr.name }}</option> }
              }
            </select>
          </div>
          <div class="field">
            <label>Clients associés</label>
            <div class="proj-pick">
              @for (cl of clients(); track cl.id) {
                <label class="chip-check">
                  <input type="checkbox" [checked]="isClientSel(m, cl.id!)" (change)="toggleClient(m, cl.id!)" />
                  {{ cl.name }}
                </label>
              }
            </div>
          </div>
        </div>

        <div class="field">
          <div class="row between">
            <label>🧩 Champs personnalisés</label>
            <button class="btn btn-sm btn-ghost" (click)="addFieldDef(m)">+ Définir un champ</button>
          </div>
          @for (def of m.custom_field_defs ?? []; track $index) {
            <div class="row" style="gap:.4rem; margin-bottom:.3rem; align-items:end">
              <input [(ngModel)]="def.label" placeholder="Libellé" style="flex:1" (ngModelChange)="syncFieldKey(def)" />
              <select [(ngModel)]="def.type" style="width:150px">
                <option value="text">Texte</option><option value="textarea">Texte long</option>
                <option value="number">Nombre</option><option value="date">Date</option>
                <option value="boolean">Oui/Non</option><option value="select">Liste</option>
              </select>
              @if (def.type === 'select') {
                <input [ngModel]="(def.options ?? []).join(', ')" (ngModelChange)="def.options = splitList($event)" placeholder="Options" style="flex:1" />
              }
              <span class="field" style="margin:0;flex:1">
                @switch (def.type) {
                  @case ('textarea') { <input [ngModel]="cfVal(m, def.key)" (ngModelChange)="setCf(m, def.key, $event)" placeholder="Valeur" /> }
                  @case ('boolean') { <select [ngModel]="cfVal(m, def.key)" (ngModelChange)="setCf(m, def.key, $event)"><option [ngValue]="true">Oui</option><option [ngValue]="false">Non</option></select> }
                  @case ('select') { <select [ngModel]="cfVal(m, def.key)" (ngModelChange)="setCf(m, def.key, $event)"><option value="">—</option>@for (o of def.options ?? []; track o) { <option [value]="o">{{ o }}</option> }</select> }
                  @default { <input [type]="def.type === 'number' ? 'number' : def.type === 'date' ? 'date' : 'text'" [ngModel]="cfVal(m, def.key)" (ngModelChange)="setCf(m, def.key, $event)" placeholder="Valeur" /> }
                }
              </span>
              <button class="btn btn-sm btn-danger" (click)="m.custom_field_defs!.splice($index, 1)">✕</button>
            </div>
          }
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
          <label>🖼️ Logo du projet <span class="muted" style="font-weight:400">(facultatif)</span></label>
          <div class="logo-row">
            <div class="logo-slot" (click)="pl.click()">
              @if (m.logo_url) { <img [src]="m.logo_url" alt="logo" /> } @else { <span class="material-icons">add_photo_alternate</span> }
            </div>
            <div class="row" style="gap:.4rem">
              <button class="btn btn-sm btn-ghost" type="button" (click)="pl.click()">Choisir…</button>
              @if (m.logo_url) { <button class="btn btn-sm btn-ghost" type="button" (click)="clearLogo(m)">Retirer</button> }
            </div>
            <input #pl type="file" accept="image/*" hidden (change)="onLogo($event)" />
          </div>
        </div>

        <div class="field">
          <div class="row between">
            <label>🖥️ Instances / machines</label>
            <button class="btn btn-sm btn-ghost" type="button" (click)="addInstance(m)">+ Ajouter</button>
          </div>
          @for (inst of m.instances ?? []; track $index) {
            <div class="inst-row">
              <input [(ngModel)]="inst.name" placeholder="Nom (ex : Prod web)" />
              <input [(ngModel)]="inst.ip" placeholder="IP machine (ex : 10.0.0.4)" />
              <input [(ngModel)]="inst.domain" placeholder="Domaine (ex : app.client.ch)" />
              <input [(ngModel)]="inst.url" placeholder="URL (facultatif)" />
              <button class="btn btn-sm btn-danger" type="button" (click)="removeInstance(m, $index)">✕</button>
            </div>
          } @empty { <p class="hint" style="margin:.2rem 0">Aucune instance. Elles s'affichent en cartes cliquables dans la vue d'ensemble.</p> }
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

        <div class="field">
          <label>🎨 Styles du projet (hérités par ses modèles)</label>
          <app-style-editor [styles]="projStyles(m)" />
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
      .proj-pick { display: flex; flex-wrap: wrap; gap: .4rem; }
      .logo-row { display: flex; align-items: center; gap: 1rem; }
      .logo-slot { width: 72px; height: 72px; border-radius: 14px; border: 1px dashed var(--border-strong); display: grid; place-items: center; cursor: pointer; overflow: hidden; background: var(--surface); flex: none; color: var(--muted); }
      .logo-slot img { width: 100%; height: 100%; object-fit: contain; }
      .inst-row { display: grid; grid-template-columns: 1.2fr 1fr 1.2fr 1fr auto; gap: .4rem; margin-bottom: .4rem; }
      @media (max-width: 700px) { .inst-row { grid-template-columns: 1fr 1fr; } }
      .chip-check { display: flex; align-items: center; gap: .3rem; border: 1px solid var(--border); border-radius: 999px; padding: .15rem .55rem; font-size: .8rem; }
      .chip-check input { width: auto; }
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
  allProjects = signal<Project[]>([]);
  allMembers = signal<(TeamMember & { teamName?: string })[]>([]);

  constructor() {
    this.clientService.list().subscribe((r) => this.clients.set(r.results));
    this.service.list().subscribe((r) => this.allProjects.set(r.results));
    this.teamService.members().subscribe((r) => {
      this.allMembers.set(r.results.map((mem) => ({
        ...mem, teamName: (mem.team_names || []).join(', '),
      })));
    });
    setTimeout(() => {
      if (this.id) {
        this.service.get(+this.id).subscribe((p) => {
          if (!p.assignments) p.assignments = [];
          if (!p.clients) p.clients = [];
          if (!p.custom_field_defs) p.custom_field_defs = [];
          if (!p.custom_fields) p.custom_fields = {};
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
          clients: [],
          parent: null,
          custom_field_defs: [],
          custom_fields: {},
        });
      }
    });
  }

  isEdit() {
    return !!this.id;
  }

  projStyles(m: Project) { if (!m.styles) m.styles = {}; return m.styles; }

  onClientChange(clientId: number | null, m: Project) {
    m.client = clientId;
    if (clientId) {
      const cl = this.clients().find((c) => c.id === clientId);
      if (cl && !m.client_name) m.client_name = cl.name;
    }
  }

  isClientSel(m: Project, id: number) { return (m.clients ?? []).includes(id); }
  toggleClient(m: Project, id: number) {
    m.clients = m.clients ?? [];
    const i = m.clients.indexOf(id);
    if (i >= 0) m.clients.splice(i, 1); else m.clients.push(id);
  }
  addFieldDef(m: Project) {
    m.custom_field_defs = m.custom_field_defs ?? [];
    m.custom_field_defs.push({ key: '', label: '', type: 'text' });
  }
  syncFieldKey(def: { key: string; label: string }) {
    if (!def.key) {
      def.key = (def.label || '').toLowerCase().normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'champ';
    }
  }
  cfVal(m: Project, key: string) { return (m.custom_fields ?? {})[key]; }
  setCf(m: Project, key: string, v: unknown) {
    m.custom_fields = m.custom_fields ?? {};
    (m.custom_fields as Record<string, unknown>)[key] = v;
  }
  splitList(raw: string): string[] { return raw.split(',').map((s) => s.trim()).filter(Boolean); }

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

  private logoFile: File | null = null;
  onLogo(ev: Event) {
    const f = (ev.target as HTMLInputElement).files?.[0] ?? null;
    this.logoFile = f;
    const m = this.model();
    if (f && m) { m.logo_url = URL.createObjectURL(f); this.model.set({ ...m }); }
  }
  clearLogo(m: Project) { this.logoFile = null; m.logo_url = null; m.logo = null; this.model.set({ ...m }); }

  addInstance(m: Project) { m.instances = m.instances ?? []; m.instances.push({ name: '', ip: '', domain: '', url: '' }); this.model.set({ ...m }); }
  removeInstance(m: Project, i: number) { m.instances?.splice(i, 1); this.model.set({ ...m }); }

  save() {
    const m = this.model();
    if (!m) return;
    if (!m.name || !m.client_name) {
      this.toast.error('Nom du projet et du client obligatoires.');
      return;
    }
    this.saving.set(true);
    const payload = { ...m }; delete (payload as Partial<Project>).logo_url;
    const req = this.isEdit()
      ? this.service.update(+this.id!, payload)
      : this.service.create(payload);
    req.subscribe({
      next: (p) => {
        const done = () => { this.toast.success('Projet enregistré.'); this.router.navigate(['/projects', p.id]); };
        if (this.logoFile) this.service.uploadLogo(p.id!, this.logoFile).subscribe({ next: done, error: done });
        else done();
      },
      error: () => {
        this.saving.set(false);
        this.toast.error("Erreur lors de l'enregistrement.");
      },
    });
  }
}
