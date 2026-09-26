import { Component, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatTabsModule } from '@angular/material/tabs';
import { StyleEditor } from '@shared/content/style-editor';
import { OrgChart } from '@shared/org-chart';
import { CompanyService, TeamService } from '@core/services/company.service';
import { ProjectService } from '@core/services/project.service';
import { ToastService } from '@core/services/api.service';
import {
  CompanyProfile, CompanyStyles, Project, StyleMap, Team, TeamMember, UsefulLink,
} from '@core/models';

const DOC_TYPES: { key: string; label: string; icon: string }[] = [
  { key: 'global', label: 'Base commune', icon: '❄️' },
  { key: 'docx', label: 'Word', icon: '📝' },
  { key: 'pdf', label: 'PDF', icon: '📄' },
  { key: 'xlsx', label: 'Excel', icon: '📊' },
  { key: 'a3', label: 'Template A3', icon: '🖼️' },
  { key: 'md', label: 'Markdown', icon: 'M↓' },
  { key: 'pptx', label: 'PowerPoint', icon: '📽️' },
];

@Component({
  selector: 'app-company-settings',
  imports: [FormsModule, RouterLink, StyleEditor, OrgChart, MatTabsModule],
  templateUrl: './company-settings.html',
  styleUrl: './company-settings.scss',
})
export class CompanySettings {
  private service = inject(CompanyService);
  private teamSvc = inject(TeamService);
  private projectSvc = inject(ProjectService);
  private toast = inject(ToastService);

  model = signal<CompanyProfile | null>(null);
  teams = signal<Team[]>([]);
  collaborators = signal<TeamMember[]>([]);
  projects = signal<Project[]>([]);
  saving = signal(false);
  tab = signal(0);
  styleTab = signal('global');
  docTypes = DOC_TYPES;
  private logoFile: File | null = null;

  nc: Partial<TeamMember> = {};
  ntName = ''; ntColor = '#38BDF8'; ntParent: number | null = null;
  linkCategories = ['Conditions générales', 'Site web', 'Support'];

  constructor() {
    this.service.get().subscribe((c) => this.model.set(c));
    this.reloadTeams();
    this.reloadCollaborators();
    this.projectSvc.list().subscribe((r) => this.projects.set(r.results));
  }

  reloadTeams() { this.teamSvc.teams().subscribe((r) => this.teams.set(r.results)); }
  reloadCollaborators() { this.teamSvc.members().subscribe((r) => this.collaborators.set(r.results)); }

  // ---- Styles par type ----
  private stylesObj(): CompanyStyles {
    const m = this.model();
    if (!m) return {};
    let s = m.styles as CompanyStyles;
    // Migration format plat -> { global }
    if (s && !('global' in s) && !('types' in s) && Object.keys(s).length) {
      s = { global: s as unknown as StyleMap, types: {} };
      m.styles = s;
    }
    if (!s || typeof s !== 'object') { s = {}; m.styles = s; }
    if (!s.global) s.global = {};
    if (!s.types) s.types = {};
    return s;
  }
  stylesFor(type: string): StyleMap {
    const s = this.stylesObj();
    if (type === 'global') return s.global!;
    if (!s.types![type]) s.types![type] = {};
    return s.types![type];
  }

  addLink(m: CompanyProfile) { m.usefulLinks.push({ category: 'Site web', label: '', url: '', order: m.usefulLinks.length }); }
  removeLink(m: CompanyProfile, i: number) { m.usefulLinks.splice(i, 1); }
  catValue(l: UsefulLink) { return this.linkCategories.includes(l.category || '') ? l.category : '__custom'; }
  isCustom(l: UsefulLink) { return !this.linkCategories.includes(l.category || ''); }
  onCat(l: UsefulLink, v: string) { l.category = v === '__custom' ? '' : v; }
  onLogo(event: Event) {
    const f = (event.target as HTMLInputElement).files?.[0] ?? null;
    this.logoFile = f;
    if (f) { const m = this.model(); if (m) m.logoUrl = URL.createObjectURL(f); }
  }

  // ---- Collaborateurs ----
  addCollaborator() {
    if (!this.nc.firstName && !this.nc.lastName) { this.toast.error('Renseignez au moins le nom.'); return; }
    this.teamSvc.addMember({ ...this.nc }).subscribe({
      next: () => { this.nc = {}; this.toast.success('Collaborateur ajouté.'); this.reloadCollaborators(); },
      error: () => this.toast.error('Ajout impossible.'),
    });
  }
  removeCollaborator(c: TeamMember) {
    if (!confirm(`Retirer ${c.fullName} de l'entreprise ?`)) return;
    this.teamSvc.removeMember(c.id!).subscribe({
      next: () => { this.toast.success('Collaborateur retiré.'); this.reloadCollaborators(); this.reloadTeams(); },
      error: () => this.toast.error('Suppression impossible.'),
    });
  }

  // ---- Équipes ----
  addTeam() {
    if (!this.ntName.trim()) { this.toast.error("Nom d'équipe requis."); return; }
    this.teamSvc.createTeam({ name: this.ntName, color: this.ntColor, parent: this.ntParent }).subscribe({
      next: () => { this.ntName = ''; this.ntColor = '#38BDF8'; this.ntParent = null; this.toast.success('Équipe créée.'); this.reloadTeams(); },
      error: () => this.toast.error('Création impossible.'),
    });
  }
  removeTeam(t: Team) {
    if (!confirm(`Supprimer l'équipe « ${t.name} » ?`)) return;
    this.teamSvc.removeTeam(t.id!).subscribe({
      next: () => { this.toast.success('Équipe supprimée.'); this.reloadTeams(); this.reloadCollaborators(); },
      error: () => this.toast.error('Suppression impossible.'),
    });
  }

  private syncUrls(m: CompanyProfile) {
    // Les liens catégorisés alimentent les champs utilisés dans les documents.
    const site = m.usefulLinks.find((l) => l.category === 'Site web');
    const cgv = m.usefulLinks.find((l) => l.category === 'Conditions générales');
    if (site) m.websiteUrl = site.url;
    if (cgv) m.termsUrl = cgv.url;
  }

  save() {
    const m = this.model();
    if (!m) return;
    this.syncUrls(m);
    this.saving.set(true);
    if (this.logoFile) {
      // 1) upload du logo (multipart), 2) mise à jour complète (JSON: liens, styles…)
      const fd = new FormData();
      fd.append('name', m.name);
      fd.append('logo', this.logoFile);
      this.service.updateWithLogo(fd).subscribe({
        next: (c) => {
          m.logoUrl = c.logoUrl;
          this.logoFile = null;
          this.service.update(m).subscribe({ next: (c2) => this.done(c2), error: () => this.fail() });
        },
        error: () => this.fail(),
      });
    } else {
      this.service.update(m).subscribe({ next: (c) => this.done(c), error: () => this.fail() });
    }
  }
  private done(c: CompanyProfile) {
    this.model.set(c); this.logoFile = null; this.saving.set(false);
    this.toast.success('Profil entreprise enregistré.');
  }
  private fail() { this.saving.set(false); this.toast.error("Erreur lors de l'enregistrement."); }
}
