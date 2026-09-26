import { Component, inject, signal, Input, WritableSignal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatTabsModule } from '@angular/material/tabs';
import { TeamService } from '@core/services/company.service';
import { ProjectService } from '@core/services/project.service';
import { ToastService } from '@core/services/api.service';
import { Project, Team, TeamMember } from '@core/models';

@Component({
  selector: 'app-team-detail',
  imports: [FormsModule, RouterLink, MatTabsModule],
  templateUrl: './team-detail.html',
  styleUrl: './team-detail.scss',
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
        this._projectIds.set((t.projectsDetail || []).map((p) => p.id));
        this._relatedIds.set(t.relatedTeams || []);
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
  saveMembers() { this.patch({ memberIds: this._memberIds() }); }
  saveProjects() { this.patch({ projectIds: this._projectIds() }); }
  saveRelated() { this.patch({ relatedTeamIds: this._relatedIds() }); }

  private patch(data: Partial<Team>) {
    this.saving.set(true);
    this.teamSvc.updateTeam(+this.id, data).subscribe({
      next: (t) => {
        this.team.set(t);
        this._memberIds.set((t.members || []).map((m) => m.id!));
        this._projectIds.set((t.projectsDetail || []).map((p) => p.id));
        this._relatedIds.set(t.relatedTeams || []);
        this.saving.set(false);
        this.toast.success('Équipe mise à jour.');
      },
      error: () => { this.saving.set(false); this.toast.error('Enregistrement impossible.'); },
    });
  }
}
