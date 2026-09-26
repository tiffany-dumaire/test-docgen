import { Component, Input } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Team } from '../core/models';

/**
 * Organigramme reconstruit automatiquement à partir des équipes (lien `parent`).
 * Rendu récursif via un `ng-template` qui se ré-appelle sur les sous-équipes.
 */
@Component({
  selector: 'app-org-chart',
  imports: [NgTemplateOutlet, RouterLink],
  template: `
    @if (roots().length) {
      <div class="orgtree">
        <ul>
          @for (r of roots(); track r.id) {
            <ng-container *ngTemplateOutlet="node; context: { $implicit: r }" />
          }
        </ul>
      </div>
    } @else {
      <div class="empty">Aucune équipe. L'organigramme se construira automatiquement dès que vous créerez des équipes.</div>
    }

    <ng-template #node let-team>
      <li>
        <a class="org-node" [routerLink]="['/teams', team.id]" [style.--team]="team.color || '#38BDF8'">
          <span class="org-dot"></span>
          <span class="org-name">{{ team.name }}</span>
          <span class="org-meta">{{ team.member_count ?? (team.members?.length || 0) }} pers. · {{ team.project_count || 0 }} projet(s)</span>
          @if (team.members?.length) {
            <span class="org-avatars">
              @for (m of team.members.slice(0, 5); track m.id) {
                <span class="org-av" [title]="m.full_name">{{ m.initials }}</span>
              }
              @if (team.members.length > 5) { <span class="org-av more">+{{ team.members.length - 5 }}</span> }
            </span>
          }
          @if (relatedNames(team); as rel) {
            @if (rel) { <span class="org-rel">↔ {{ rel }}</span> }
          }
        </a>
        @if (children(team).length) {
          <ul>
            @for (c of children(team); track c.id) {
              <ng-container *ngTemplateOutlet="node; context: { $implicit: c }" />
            }
          </ul>
        }
      </li>
    </ng-template>
  `,
})
export class OrgChart {
  @Input({ required: true }) teams: Team[] = [];

  roots(): Team[] {
    return this.teams.filter((t) => !t.parent ||
      !this.teams.some((x) => x.id === t.parent));
  }
  children(team: Team): Team[] {
    return this.teams.filter((t) => t.parent === team.id);
  }
  relatedNames(team: Team): string {
    const ids = team.relatedTeams ?? [];
    if (!ids.length) return '';
    return this.teams.filter((t) => ids.includes(t.id!)).map((t) => t.name).join(', ');
  }
}
