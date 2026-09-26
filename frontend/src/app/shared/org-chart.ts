import { Component, Input } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Team } from '@core/models';

/**
 * Organigramme reconstruit automatiquement à partir des équipes (lien `parent`).
 * Rendu récursif via un `ng-template` qui se ré-appelle sur les sous-équipes.
 */
@Component({
  selector: 'app-org-chart',
  imports: [NgTemplateOutlet, RouterLink],
  templateUrl: './org-chart.html',
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
