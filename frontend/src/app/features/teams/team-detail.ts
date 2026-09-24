import { Component, inject, signal, Input, WritableSignal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatTabsModule } from '@angular/material/tabs';
import { TeamService } from '../../core/services/company.service';
import { ProjectService } from '../../core/services/project.service';
import { ToastService } from '../../core/services/api.service';
import { Project, Team, TeamMember } from '../../core/models';

@Component({
  selector: 'app-team-detail',
  imports: [FormsModule, RouterLink, MatTabsModule],
  template: `
    @if (team(); as t) {
      <div class="row between">
        <div>
          <h1><span class="tdot" [style.background]="t.color || '#38BDF8'"></span> {{ t.name }}</h1>
          <div class="muted">
            {{ t.member_count }} collaborateur(s) · {{ t.project_count }} projet(s)
            @if (t.parent_name) { · sous-équipe de {{ t.parent_name }} }
          </div>
        </div>
        <a class="btn btn-ghost" routerLink="/company">← Mon entreprise</a>
      </div>

      <mat-tab-group class="detail-tabs" animationDuration="200ms" mat-stretch-tabs="false">
        <!-- Vue d'ensemble -->
        <mat-tab label="Vue d'ensemble">
          <div class="tabpad">
            <div class="card stack">
              <div class="form-grid">
                <div class="field"><label>Nom</label><input [(ngModel)]="t.name" /></div>
                <div class="field"><label>Couleur</label><input type="color" [(ngModel)]="t.color" style="width:52px;height:36px;padding:2px" /></div>
              </div>
              <div class="field"><label>Description</label><textarea [(ngModel)]="t.description" rows="3"></textarea></div>
              <div class="field">
                <label>Équipe parente</label>
                <select [(ngModel)]="t.parent">
                  <option [ngValue]="null">— aucune (racine) —</option>
                  @for (o of otherTeams(); track o.id) { <option [ngValue]="o.id">{{ o.name }}</option> }
                </select>
              </div>
              <button class="btn btn-primary" (click)="saveInfo()" [disabled]="saving()">Enregistrer</button>
            </div>
          </div>
        </mat-tab>

        <!-- Collaborateurs -->
        <mat-tab label="Collaborateurs ({{ memberIds().length }})">
          <div class="tabpad">
            <div class="card stack">
              <h3>Collaborateurs de l'équipe</h3>
              <p class="muted" style="margin:0">Sélectionnez les collaborateurs à associer à cette équipe. Un collaborateur peut appartenir à plusieurs équipes.</p>
              <div class="pick-grid">
                @for (c of allCollaborators(); track c.id) {
                  <label class="pick" [class.on]="memberIds().includes(c.id!)">
                    <input type="checkbox" [checked]="memberIds().includes(c.id!)" (change)="toggleMember(c.id!)" />
                    <span class="ava">{{ c.initials }}</span>
                    <span><b>{{ c.full_name }}</b><br><span class="muted">{{ c.role || '—' }}</span></span>
                  </label>
                }
                @if (!allCollaborators().length) { <div class="muted">Aucun collaborateur. Ajoutez-en depuis « Mon entreprise → Collaborateurs ».</div> }
              </div>
              <button class="btn btn-primary" (click)="saveMembers()" [disabled]="saving()">Enregistrer les collaborateurs</button>
            </div>
          </div>
        </mat-tab>

        <!-- Projets -->
        <mat-tab label="Projets ({{ projectIds().length }})">
          <div class="tabpad">
            <div class="card stack">
              <h3>Projets gérés par l'équipe</h3>
              <p class="muted" style="margin:0">Les projets sélectionnés sont pilotés par cette équipe.</p>
              <div class="pick-grid">
                @for (p of allProjects(); track p.id) {
                  <label class="pick" [class.on]="projectIds().includes(p.id!)">
                    <input type="checkbox" [checked]="projectIds().includes(p.id!)" (change)="toggleProject(p.id!)" />
                    <span><b>{{ p.name }}</b><br><span class="muted">{{ p.client_name }} · {{ statusLabel(p.status) }}</span></span>
                  </label>
                }
                @if (!allProjects().length) { <div class="muted">Aucun projet.</div> }
              </div>
              <button class="btn btn-primary" (click)="saveProjects()" [disabled]="saving()">Enregistrer les projets</button>
            </div>

            @if (t.projects_detail?.length) {
              <div class="card">
                <h3>Projets actuels</h3>
                <table>
                  <thead><tr><th>Projet</th><th>Client</th><th>Statut</th><th></th></tr></thead>
                  <tbody>
                    @for (p of t.projects_detail!; track p.id) {
                      <tr><td><a [routerLink]="['/projects', p.id]">{{ p.name }}</a></td>
                        <td>{{ p.client_name }}</td>
                        <td><span class="badge badge-type">{{ statusLabel(p.status) }}</span></td>
                        <td><a class="btn btn-sm btn-ghost" [routerLink]="['/projects', p.id]">Ouvrir</a></td></tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          </div>
        </mat-tab>

        <!-- Hiérarchie & liens -->
        <mat-tab label="Hiérarchie & liens">
          <div class="tabpad">
            <div class="card stack">
              <h3>Sous-équipes</h3>
              @if (subteams().length) {
                <div class="row wrap" style="gap:.4rem">
                  @for (s of subteams(); track s.id) { <a class="chip-link" [routerLink]="['/teams', s.id]">{{ s.name }}</a> }
                </div>
              } @else { <div class="muted">Aucune sous-équipe. Définissez cette équipe comme « parente » d'une autre.</div> }
            </div>
            <div class="card stack">
              <h3>Équipes liées</h3>
              <p class="muted" style="margin:0">Liens hiérarchiques transverses avec d'autres équipes.</p>
              <div class="pick-grid">
                @for (o of otherTeams(); track o.id) {
                  <label class="pick" [class.on]="relatedIds().includes(o.id!)">
                    <input type="checkbox" [checked]="relatedIds().includes(o.id!)" (change)="toggleRelated(o.id!)" />
                    <span><b>{{ o.name }}</b></span>
                  </label>
                }
              </div>
              <button class="btn btn-primary" (click)="saveRelated()" [disabled]="saving()">Enregistrer les liens</button>
            </div>
          </div>
        </mat-tab>
      </mat-tab-group>
    }
  `,
  styles: [`
    .detail-tabs { margin-top: 1rem; }
    .tabpad { padding-top: 1.2rem; display:flex; flex-direction:column; gap:1rem; }
    h1 .tdot { display:inline-block; width:14px; height:14px; border-radius:50%; margin-right:.5rem; vertical-align:middle; }
    .pick-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(230px,1fr)); gap:.5rem; }
    .pick { display:flex; align-items:center; gap:.5rem; border:1px solid var(--border-strong); border-radius:12px; padding:.5rem .7rem; cursor:pointer; font-weight:500; background:var(--surface); }
    .pick.on { border-color:var(--primary); background:var(--primary-050); }
    .pick input { width:auto; }
    .ava { display:inline-grid; place-items:center; width:30px; height:30px; border-radius:50%; font-size:.7rem; font-weight:700; color:#fff; background:linear-gradient(135deg,#38BDF8,#6366F1); flex:none; }
    .chip-link { display:inline-flex; font-size:.78rem; font-weight:600; background:var(--primary-050); color:var(--primary-dark); border-radius:999px; padding:.25rem .7rem; }
  `],
})
export class TeamDetail {
  private teamSvc = inject(TeamService);
  private projectSvc = inject(ProjectService);
  private toast = inject(ToastService);

  @Input() id!: string;
  team = signal<Team | null>(null);
  allTeams = signal<Team[]>([]);
  allCollaborators = signal<TeamMember[]>([]);
  allProjects = signal<Project[]>([]);
  saving = signal(false);

  private _memberIds = signal<number[]>([]);
  private _projectIds = signal<number[]>([]);
  private _relatedIds = signal<number[]>([]);
  memberIds = this._memberIds.asReadonly();
  projectIds = this._projectIds.asReadonly();
  relatedIds = this._relatedIds.asReadonly();

  constructor() {
    setTimeout(() => {
      this.teamSvc.team(+this.id).subscribe((t) => {
        this.team.set(t);
        this._memberIds.set((t.members || []).map((m) => m.id!));
        this._projectIds.set((t.projects_detail || []).map((p) => p.id));
        this._relatedIds.set(t.related_teams || []);
      });
      this.teamSvc.teams().subscribe((r) => this.allTeams.set(r.results));
      this.teamSvc.members().subscribe((r) => this.allCollaborators.set(r.results));
      this.projectSvc.list().subscribe((r) => this.allProjects.set(r.results));
    });
  }

  otherTeams() { return this.allTeams().filter((t) => t.id !== +this.id); }
  subteams() { return this.allTeams().filter((t) => t.parent === +this.id); }
  statusLabel(s: string) { return ({ active: 'Actif', on_hold: 'En pause', archived: 'Archivé' } as Record<string, string>)[s] || s; }

  toggleMember(id: number) { this.toggle(this._memberIds, id); }
  toggleProject(id: number) { this.toggle(this._projectIds, id); }
  toggleRelated(id: number) { this.toggle(this._relatedIds, id); }
  private toggle(sig: WritableSignal<number[]>, id: number) {
    const arr = [...sig()];
    const i = arr.indexOf(id);
    if (i >= 0) arr.splice(i, 1); else arr.push(id);
    sig.set(arr);
  }

  saveInfo() {
    const t = this.team()!;
    this.patch({ name: t.name, description: t.description, color: t.color, parent: t.parent ?? null });
  }
  saveMembers() { this.patch({ member_ids: this._memberIds() }); }
  saveProjects() { this.patch({ project_ids: this._projectIds() }); }
  saveRelated() { this.patch({ related_team_ids: this._relatedIds() }); }

  private patch(data: Partial<Team>) {
    this.saving.set(true);
    this.teamSvc.updateTeam(+this.id, data).subscribe({
      next: (t) => {
        this.team.set(t);
        this._memberIds.set((t.members || []).map((m) => m.id!));
        this._projectIds.set((t.projects_detail || []).map((p) => p.id));
        this._relatedIds.set(t.related_teams || []);
        this.saving.set(false);
        this.toast.success('Équipe mise à jour.');
      },
      error: () => { this.saving.set(false); this.toast.error('Enregistrement impossible.'); },
    });
  }
}
