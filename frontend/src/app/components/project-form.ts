import { Component, inject, signal, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgTemplateOutlet } from '@angular/common';
import { Router } from '@angular/router';
import { MatTabsModule } from '@angular/material/tabs';
import { BackDirective } from '@shared/back.directive';
import { ProjectService } from '@core/services/project.service';
import { ClientService } from '@core/services/client.service';
import { TeamService } from '@core/services/company.service';
import { StyleEditor } from '@shared/content/style-editor';
import { ToastService } from '@core/services/api.service';
import { Client, Contact, ContactKind, Project, ProjectRepo, ProjectStatus, Team, TeamMember } from '@core/models';

@Component({
  selector: 'app-project-form',
  imports: [FormsModule, NgTemplateOutlet, StyleEditor, MatTabsModule, BackDirective],
  templateUrl: './project-form.html',
  styleUrl: './project-form.scss',
})
export class ProjectForm {
  private service = inject(ProjectService);
  private clientService = inject(ClientService);
  private teamService = inject(TeamService);
  private toast = inject(ToastService);
  private router = inject(Router);

  protected readonly ContactKind = ContactKind;

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
        ...mem, teamName: (mem.teamNames || []).join(', '),
      })));
    });
    setTimeout(() => {
      if (this.id) {
        this.service.get(+this.id).subscribe((p) => {
          if (!p.assignments) p.assignments = [];
          if (!p.clients) p.clients = [];
          if (!p.customFieldDefs) p.customFieldDefs = [];
          if (!p.customFields) p.customFields = {};
          this.model.set(p);
        });
      } else {
        this.model.set({
          name: '',
          clientName: '',
          description: '',
          reference: '',
          status: ProjectStatus.Active,
          contacts: [],
          assignments: [],
          clients: [],
          parent: null,
          customFieldDefs: [],
          customFields: {},
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
      if (cl && !m.clientName) m.clientName = cl.name;
    }
  }

  isClientSel(m: Project, id: number) { return (m.clients ?? []).includes(id); }
  toggleClient(m: Project, id: number) {
    m.clients = m.clients ?? [];
    const i = m.clients.indexOf(id);
    if (i >= 0) m.clients.splice(i, 1); else m.clients.push(id);
  }
  addFieldDef(m: Project) {
    m.customFieldDefs = m.customFieldDefs ?? [];
    m.customFieldDefs.push({ key: '', label: '', type: 'text' });
  }
  syncFieldKey(def: { key: string; label: string }) {
    if (!def.key) {
      def.key = (def.label || '').toLowerCase().normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'champ';
    }
  }
  cfVal(m: Project, key: string) { return (m.customFields ?? {})[key]; }
  setCf(m: Project, key: string, v: unknown) {
    m.customFields = m.customFields ?? {};
    (m.customFields as Record<string, unknown>)[key] = v;
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
    return this.model()?.contacts.filter((c) => c.kind === ContactKind.Client) ?? [];
  }
  internalContacts() {
    return this.model()?.contacts.filter((c) => c.kind === ContactKind.Internal) ?? [];
  }

  addContact(kind: ContactKind) {
    const m = this.model();
    if (!m) return;
    m.contacts.push({
      kind,
      firstName: '',
      lastName: '',
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
    if (f && m) { m.logoUrl = URL.createObjectURL(f); this.model.set({ ...m }); }
  }
  clearLogo(m: Project) { this.logoFile = null; m.logoUrl = null; m.logo = null; this.model.set({ ...m }); }

  addInstance(m: Project) { m.instances = m.instances ?? []; m.instances.push({ name: '', ip: '', domain: '', url: '' }); this.model.set({ ...m }); }
  removeInstance(m: Project, i: number) { m.instances?.splice(i, 1); this.model.set({ ...m }); }

  private repoId() { return 'r' + Date.now().toString(36) + Math.floor(Math.random() * 1000); }
  addRepo(m: Project) { m.repos = m.repos ?? []; m.repos.push({ id: this.repoId(), parent: null, name: '', url: '', component: '', instance: '' }); this.model.set({ ...m }); }
  removeRepo(m: Project, rp: ProjectRepo) {
    m.repos = (m.repos ?? []).filter((x) => x.id !== rp.id);
    for (const r of m.repos) if (r.parent === rp.id) r.parent = rp.parent ?? null;  // ré-attache les enfants
    this.model.set({ ...m });
  }
  /** Parents possibles : tous les dépôts sauf lui-même et ses descendants (anti-cycle). */
  repoParents(m: Project, rp: ProjectRepo): ProjectRepo[] {
    const repos = m.repos ?? [];
    const banned = new Set<string>([rp.id]);
    let changed = true;
    while (changed) {
      changed = false;
      for (const r of repos) if (r.parent && banned.has(r.parent) && !banned.has(r.id)) { banned.add(r.id); changed = true; }
    }
    return repos.filter((r) => !banned.has(r.id));
  }

  save() {
    const m = this.model();
    if (!m) return;
    if (!m.name || !m.clientName) {
      this.toast.error('Nom du projet et du client obligatoires.');
      return;
    }
    this.saving.set(true);
    const payload = { ...m }; delete (payload as Partial<Project>).logoUrl;
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
