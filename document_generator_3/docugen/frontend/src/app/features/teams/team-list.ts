import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TeamService } from '../../core/services/company.service';
import { ToastService } from '../../core/services/api.service';
import { Team, TeamMember } from '../../core/models';

@Component({
  selector: 'app-team-list',
  imports: [FormsModule],
  template: `
    <div class="row between">
      <h1>Équipes de l'entreprise</h1>
    </div>
    <p class="muted">Organisez vos équipes internes et leurs membres. Affectez-les
      ensuite aux projets (équipe de développement).</p>

    <div class="card stack" style="margin-bottom:1rem">
      <h3>Nouvelle équipe</h3>
      <div class="row" style="gap:.5rem">
        <input [(ngModel)]="newTeamName" placeholder="Nom de l'équipe (ex : Développement)" style="flex:1" />
        <button class="btn btn-primary" (click)="addTeam()">+ Créer</button>
      </div>
    </div>

    @for (t of teams(); track t.id) {
      <div class="card stack" style="margin-bottom:1rem">
        <div class="row between">
          <h3>👥 {{ t.name }} <span class="muted" style="font-weight:400">· {{ t.member_count }} membre(s)</span></h3>
          <button class="btn btn-sm btn-danger" (click)="removeTeam(t)">Supprimer l'équipe</button>
        </div>
        @if (t.members.length) {
          <table>
            <thead><tr><th>Nom</th><th>Fonction</th><th>Email</th><th></th></tr></thead>
            <tbody>
              @for (m of t.members; track m.id) {
                <tr>
                  <td><b>{{ m.full_name }}</b></td>
                  <td>{{ m.role || '—' }}</td>
                  <td>{{ m.email || '—' }}</td>
                  <td><button class="btn btn-sm btn-danger" (click)="removeMember(m)">✕</button></td>
                </tr>
              }
            </tbody>
          </table>
        } @else {
          <div class="muted">Aucun membre pour l'instant.</div>
        }
        <div class="row" style="gap:.4rem;flex-wrap:wrap;align-items:end">
          <div class="field" style="margin:0"><label>Prénom</label><input [(ngModel)]="draft[t.id!].first_name" /></div>
          <div class="field" style="margin:0"><label>Nom</label><input [(ngModel)]="draft[t.id!].last_name" /></div>
          <div class="field" style="margin:0"><label>Fonction</label><input [(ngModel)]="draft[t.id!].role" /></div>
          <div class="field" style="margin:0"><label>Email</label><input [(ngModel)]="draft[t.id!].email" /></div>
          <button class="btn btn-ghost" (click)="addMember(t)">+ Membre</button>
        </div>
      </div>
    } @empty {
      <div class="card"><div class="muted" style="text-align:center;padding:1rem">Aucune équipe. Créez-en une ci-dessus.</div></div>
    }
  `,
})
export class TeamList {
  private service = inject(TeamService);
  private toast = inject(ToastService);
  teams = signal<Team[]>([]);
  newTeamName = '';
  draft: Record<number, Partial<TeamMember>> = {};

  constructor() { this.reload(); }

  reload() {
    this.service.teams().subscribe((r) => {
      this.teams.set(r.results);
      for (const t of r.results) { if (t.id && !this.draft[t.id]) this.draft[t.id] = {}; }
    });
  }

  addTeam() {
    if (!this.newTeamName.trim()) return;
    this.service.createTeam({ name: this.newTeamName, members: [] }).subscribe({
      next: () => { this.newTeamName = ''; this.toast.success('Équipe créée.'); this.reload(); },
      error: () => this.toast.error('Création impossible.'),
    });
  }
  removeTeam(t: Team) {
    if (!confirm(`Supprimer l'équipe « ${t.name} » et ses membres ?`)) return;
    this.service.removeTeam(t.id!).subscribe({
      next: () => { this.toast.success('Équipe supprimée.'); this.reload(); },
      error: () => this.toast.error('Suppression impossible.'),
    });
  }
  addMember(t: Team) {
    const d = this.draft[t.id!] || {};
    if (!d.first_name && !d.last_name) { this.toast.error('Renseignez au moins le nom.'); return; }
    this.service.addMember({ ...d, team: t.id }).subscribe({
      next: () => { this.draft[t.id!] = {}; this.toast.success('Membre ajouté.'); this.reload(); },
      error: () => this.toast.error('Ajout impossible.'),
    });
  }
  removeMember(m: TeamMember) {
    this.service.removeMember(m.id!).subscribe({
      next: () => { this.toast.success('Membre retiré.'); this.reload(); },
      error: () => this.toast.error('Suppression impossible.'),
    });
  }
}
