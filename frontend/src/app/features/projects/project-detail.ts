import { Component, inject, signal, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SlicePipe, DatePipe } from '@angular/common';
import { MatTabsModule } from '@angular/material/tabs';
import { MeetingCalendar } from '../../shared/meeting-calendar';
import { ProjectExtrasService } from '../../core/services/project-extras.service';
import { Meeting, JournalEntry, ProjectLink } from '../../core/models';
import { MembershipService, Membership } from '../../core/services/membership.service';
import { RouterLink } from '@angular/router';
import { ProjectService } from '../../core/services/project.service';
import { DocumentService } from '../../core/services/document.service';
import { FormService } from '../../core/services/form.service';
import { OnlineForm, Project, ProjectDocument } from '../../core/models';

@Component({
  selector: 'app-project-detail',
  imports: [RouterLink, FormsModule, SlicePipe, DatePipe, MatTabsModule, MeetingCalendar],
  template: `
    @if (project(); as p) {
      <div class="row between">
        <div>
          <h1>{{ p.name }}</h1>
          <div class="muted">{{ p.client_name }} · {{ p.reference || 'sans référence' }}
            @if (p.parent) { · sous-projet }
          </div>
        </div>
        <div class="row" style="gap:.5rem">
          <a class="btn btn-ghost" [routerLink]="['/projects', p.id, 'edit']">Éditer</a>
          <a class="btn btn-primary" [routerLink]="['/documents/new']" [queryParams]="{ project: p.id }">+ Document</a>
        </div>
      </div>

      <mat-tab-group class="detail-tabs" animationDuration="200ms" mat-stretch-tabs="false">
        <mat-tab label="Vue d'ensemble">
          <div class="tabpad">
            @if (p.description) { <div class="card"><p>{{ p.description }}</p></div> }
            @if (p.children?.length) {
              <div class="card"><h3>🌳 Sous-projets</h3>
                @for (ch of p.children; track ch.id) {
                  <div class="row between" style="padding:.3rem 0"><a [routerLink]="['/projects', ch.id]">{{ ch.name }}</a><span class="tag">{{ ch.status }}</span></div>
                }
              </div>
            }
            @if (p.clients_detail?.length) {
              <div class="card"><h3>🤝 Clients associés</h3>
                <div class="row wrap" style="gap:.4rem">@for (cl of p.clients_detail; track cl.id) { <span class="badge badge-type">{{ cl.name }}</span> }</div>
              </div>
            }
            <div class="grid-cards">
              <div class="card"><h3>👤 Contacts client</h3>
                @for (c of clientContacts(p); track c.id) {
                  <div class="contact"><strong>{{ c.full_name }}</strong><div class="muted">{{ c.role }}</div><div class="tag">{{ c.email }} · {{ c.phone }}</div></div>
                } @empty { <div class="muted">Aucun contact client.</div> }
              </div>
              <div class="card"><h3>🧑‍💼 Contacts internes</h3>
                @for (c of internalContacts(p); track c.id) {
                  <div class="contact"><strong>{{ c.full_name }}</strong><div class="muted">{{ c.role }}</div><div class="tag">{{ c.email }} · {{ c.phone }}</div></div>
                } @empty { <div class="muted">Aucun contact interne.</div> }
              </div>
            </div>
          </div>
        </mat-tab>

        <mat-tab label="Équipe & accès">
          <div class="tabpad">
            <div class="card"><h3>🛠️ Équipe de développement</h3>
              @if (p.assignments?.length) {
                <table><thead><tr><th>Membre</th><th>Rôle</th><th>Équipe</th><th>Email</th></tr></thead>
                  <tbody>@for (a of p.assignments; track a.id) {
                    <tr><td><b>{{ a.member_name }}</b></td><td>{{ a.role || '—' }}</td><td>{{ a.team_name }}</td><td>{{ a.member_email || '—' }}</td></tr>
                  }</tbody></table>
              } @else { <div class="muted">Aucun membre affecté.</div> }
            </div>
            <div class="card"><h3>🔐 Membres & accès</h3>
              @if (members().length) {
                <table><thead><tr><th>Utilisateur</th><th>Email</th><th>Rôles</th><th></th></tr></thead>
                  <tbody>@for (m of members(); track m.id) {
                    <tr><td><b>{{ m.user_name || '—' }}</b></td><td>{{ m.user_email }}</td><td>{{ (m.roles || []).join(', ') || '—' }}</td>
                      <td><button class="btn btn-sm btn-danger" (click)="removeMember(m)">✕</button></td></tr>
                  }</tbody></table>
              } @else { <div class="muted">Aucun utilisateur rattaché.</div> }
              <div class="row" style="gap:.5rem;margin-top:.6rem;flex-wrap:wrap;align-items:end">
                <div class="field" style="margin:0;min-width:200px"><label>Utilisateur</label>
                  <select [(ngModel)]="newUser"><option [ngValue]="null">—</option>
                    @for (u of users(); track u.id) { <option [ngValue]="u.id">{{ u.full_name || u.email }}</option> }</select></div>
                <div class="field" style="margin:0;flex:1;min-width:180px"><label>Rôles (virgules)</label><input [(ngModel)]="newRoles" placeholder="Chef de projet, Validateur" /></div>
                <button class="btn btn-ghost" (click)="addMember()" [disabled]="!newUser">+ Rattacher</button>
              </div>
            </div>
          </div>
        </mat-tab>

        <mat-tab label="Documents & formulaires">
          <div class="tabpad">
            <div class="card"><div class="row between"><h3>📄 Documents</h3>
              <a class="btn btn-sm btn-primary" [routerLink]="['/documents/new']" [queryParams]="{ project: p.id }">+ Nouveau</a></div>
              @if (documents().length) {
                <table><thead><tr><th>Titre</th><th>Type</th><th>Confidentialité</th><th>Version</th><th></th></tr></thead>
                  <tbody>@for (d of documents(); track d.id) {
                    <tr><td><a [routerLink]="['/documents', d.id]">{{ d.title }}</a></td>
                      <td><span class="badge badge-type">{{ d.doc_type }}</span></td>
                      <td><span class="badge" [class]="'badge-' + d.confidentiality">{{ d.confidentiality_display }}</span></td>
                      <td>v{{ d.current_version }}</td>
                      <td><a class="btn btn-sm btn-ghost" [routerLink]="['/documents', d.id]">Ouvrir</a></td></tr>
                  }</tbody></table>
              } @else { <div class="muted">Aucun document.</div> }
            </div>
            <div class="card"><h3>📝 Formulaires liés</h3>
              @if (forms().length) {
                <table><thead><tr><th>Titre</th><th>Lien réduit</th><th>Réponses</th></tr></thead>
                  <tbody>@for (f of forms(); track f.id) {
                    <tr><td><a [routerLink]="['/forms', f.id]">{{ f.title }}</a></td>
                      <td><a [href]="f.short_url" target="_blank">{{ f.short_url }}</a></td><td>{{ f.submission_count }}</td></tr>
                  }</tbody></table>
              } @else { <div class="muted">Aucun formulaire lié.</div> }
            </div>
          </div>
        </mat-tab>

        <mat-tab label="Liens utiles">
          <div class="tabpad">
            <div class="card"><h3>🔗 Liens utiles</h3>
              @for (l of links(); track l.id) {
                <div class="row between" style="margin-bottom:.3rem">
                  <div><span class="tag">{{ l.category || '—' }}</span> <a [href]="l.url" target="_blank">{{ l.name }}</a>
                    @if (l.comment) { <div class="muted" style="font-size:.75rem">{{ l.comment }}</div> }</div>
                  <button class="btn btn-sm btn-danger" (click)="delLink(l)">✕</button></div>
              } @empty { <div class="muted">Aucun lien.</div> }
              <div class="row" style="gap:.3rem;flex-wrap:wrap;margin-top:.6rem">
                <input [(ngModel)]="nlCat" placeholder="Catégorie" style="width:130px" />
                <input [(ngModel)]="nlName" placeholder="Nom" style="flex:1;min-width:120px" />
                <input [(ngModel)]="nlUrl" placeholder="https://…" style="flex:1;min-width:140px" />
                <input [(ngModel)]="nlComment" placeholder="Commentaire" style="flex:1;min-width:120px" />
                <button class="btn btn-primary btn-sm" (click)="addLink(p.id!)">+ Ajouter</button></div>
            </div>
          </div>
        </mat-tab>

        <mat-tab label="Réunions">
          <div class="tabpad">
            <app-meeting-calendar [meetings]="meetings()" />
            <div class="card">
              <h3>➕ Ajouter une réunion</h3>
              <div class="row" style="gap:.3rem;flex-wrap:wrap;align-items:center">
                <input [(ngModel)]="nmTitle" placeholder="Titre" style="flex:1;min-width:140px" />
                <input type="datetime-local" [(ngModel)]="nmDate" style="width:210px" />
                <input [(ngModel)]="nmLoc" placeholder="Lieu / lien" style="flex:1;min-width:140px" />
                <button class="btn btn-primary btn-sm" (click)="addMeeting(p.id!)">+ Ajouter</button>
              </div>
              <div class="listwrap">
                @for (mtg of meetings(); track mtg.id) {
                  <div class="row between mtg-line">
                    <div><b>{{ mtg.title }}</b>
                      <span class="muted" style="font-size:.78rem">
                        @if (mtg.date) { · {{ mtg.date | date:'dd/MM/yyyy HH:mm' }} } @if (mtg.location) { · {{ mtg.location }} }
                      </span></div>
                    <button class="btn btn-sm btn-danger" (click)="delMeeting(mtg)">✕</button>
                  </div>
                } @empty { <div class="muted">Aucune réunion planifiée.</div> }
              </div>
            </div>
          </div>
        </mat-tab>

        <mat-tab label="Journal">
          <div class="tabpad">
            <div class="card"><h3>📓 Journal du projet</h3>
              <div class="row" style="gap:.3rem;flex-wrap:wrap;align-items:end;margin-bottom:.6rem">
                <select [(ngModel)]="njCat" style="width:130px"><option value="note">Note</option><option value="decision">Décision</option><option value="risk">Risque</option><option value="action">Action</option><option value="incident">Incident</option><option value="info">Info</option></select>
                <select [(ngModel)]="njConf" style="width:150px"><option value="public">Public</option><option value="internal">Interne</option><option value="confidential">Confidentiel</option><option value="restricted">Strictement confidentiel</option></select>
                <input [(ngModel)]="njBody" placeholder="Commentaire…" style="flex:1;min-width:180px" />
                <button class="btn btn-ghost btn-sm" (click)="addJournal(p.id!)" [disabled]="!njBody">+ Ajouter</button>
              </div>
              @for (j of journal(); track j.id) {
                <div class="row between" style="border-bottom:1px solid var(--border);padding:.4rem 0">
                  <div><span class="badge" [class.badge-internal]="j.confidentiality==='internal'" [class.badge-confidential]="j.confidentiality==='confidential'" [class.badge-restricted]="j.confidentiality==='restricted'" [class.badge-public]="j.confidentiality==='public'">{{ j.category }}</span>
                    <span style="margin-left:.5rem">{{ j.body }}</span>
                    <div class="muted" style="font-size:.72rem">{{ j.author }} · {{ j.created_at | slice:0:10 }}</div></div>
                  <button class="btn btn-sm btn-danger" (click)="delJournal(j)">✕</button></div>
              } @empty { <div class="muted">Aucune entrée.</div> }
            </div>
          </div>
        </mat-tab>
      </mat-tab-group>
    }
  `,
  styles: [
    `
      .detail-tabs { margin-top: 1rem; }
      .tabpad { padding-top: 1.2rem; display: flex; flex-direction: column; gap: 1rem; }
      .contact {
        padding: 0.5rem 0;
        border-bottom: 1px solid var(--border);
      }
      .contact:last-child {
        border-bottom: none;
      }
    `,
  ],
})
export class ProjectDetail {
  private projects = inject(ProjectService);
  private documentsSvc = inject(DocumentService);
  private formsSvc = inject(FormService);
  private membershipSvc = inject(MembershipService);
  private extras = inject(ProjectExtrasService);

  @Input() id!: string;
  project = signal<Project | null>(null);
  documents = signal<ProjectDocument[]>([]);
  forms = signal<OnlineForm[]>([]);
  members = signal<Membership[]>([]);
  users = signal<{ id?: number; full_name?: string; email: string }[]>([]);
  newUser: number | null = null;
  newRoles = '';
  links = signal<ProjectLink[]>([]);
  meetings = signal<Meeting[]>([]);
  journal = signal<JournalEntry[]>([]);
  nlCat=''; nlName=''; nlUrl=''; nlComment='';
  nmTitle=''; nmLoc=''; nmDate='';
  njCat='note'; njConf='internal'; njBody='';

  constructor() {
    setTimeout(() => {
      const pid = +this.id;
      this.projects.get(pid).subscribe((p) => this.project.set(p));
      this.documentsSvc.list({ project: pid }).subscribe((r) => this.documents.set(r.results));
      this.formsSvc.list({ project: pid }).subscribe((r) => this.forms.set(r.results));
      this.loadMembers(pid);
      this.membershipSvc.users().subscribe((r) => this.users.set(r.results));
      this.reloadExtras(pid);
    });
  }

  reloadExtras(pid: number) {
    this.extras.links(pid).subscribe((r) => this.links.set(r.results));
    this.extras.meetings(pid).subscribe((r) => this.meetings.set(r.results));
    this.extras.journal(pid).subscribe((r) => this.journal.set(r.results));
  }
  addLink(pid: number) {
    if (!this.nlName) return;
    this.extras.addLink({ project: pid, category: this.nlCat, name: this.nlName, url: this.nlUrl, comment: this.nlComment }).subscribe(() => {
      this.nlCat=''; this.nlName=''; this.nlUrl=''; this.nlComment=''; this.reloadExtras(pid); });
  }
  delLink(l: ProjectLink) { if (l.id) this.extras.removeLink(l.id).subscribe(() => this.reloadExtras(+this.id)); }
  addMeeting(pid: number) {
    if (!this.nmTitle) return;
    this.extras.addMeeting({ project: pid, title: this.nmTitle, location: this.nmLoc, date: this.nmDate || null }).subscribe(() => {
      this.nmTitle=''; this.nmLoc=''; this.nmDate=''; this.reloadExtras(pid); });
  }
  delMeeting(m: Meeting) { if (m.id) this.extras.removeMeeting(m.id).subscribe(() => this.reloadExtras(+this.id)); }
  addJournal(pid: number) {
    if (!this.njBody) return;
    this.extras.addJournal({ project: pid, category: this.njCat, confidentiality: this.njConf, body: this.njBody }).subscribe(() => {
      this.njBody=''; this.reloadExtras(pid); });
  }
  delJournal(j: JournalEntry) { if (j.id) this.extras.removeJournal(j.id).subscribe(() => this.reloadExtras(+this.id)); }

  loadMembers(pid: number) {
    this.membershipSvc.list(pid).subscribe((r) => this.members.set(r.results));
  }
  addMember() {
    if (!this.newUser) return;
    const roles = this.newRoles.split(',').map((r) => r.trim()).filter(Boolean);
    this.membershipSvc.create({ user: this.newUser, project: +this.id, roles }).subscribe({
      next: () => { this.newUser = null; this.newRoles = ''; this.loadMembers(+this.id); },
    });
  }
  removeMember(m: Membership) {
    if (m.id) this.membershipSvc.remove(m.id).subscribe(() => this.loadMembers(+this.id));
  }

  clientContacts(p: Project) {
    return p.contacts.filter((c) => c.kind === 'client');
  }
  internalContacts(p: Project) {
    return p.contacts.filter((c) => c.kind === 'internal');
  }
}
