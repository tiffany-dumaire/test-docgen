import { Component, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatTabsModule } from '@angular/material/tabs';
import { StyleEditor } from '../documents/style-editor';
import { OrgChart } from '../../shared/org-chart';
import { CompanyService, TeamService } from '../../core/services/company.service';
import { ProjectService } from '../../core/services/project.service';
import { ToastService } from '../../core/services/api.service';
import {
  CompanyProfile, CompanyStyles, Project, StyleMap, Team, TeamMember,
} from '../../core/models';

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
  template: `
    <div class="row between">
      <h1>Mon entreprise</h1>
      @if (tab() === 0 || tab() === 3) {
        <button class="btn btn-primary" (click)="save()" [disabled]="saving()">Enregistrer</button>
      }
    </div>

    @if (model(); as m) {
      <mat-tab-group class="detail-tabs" animationDuration="200ms" mat-stretch-tabs="false"
                     [selectedIndex]="tab()" (selectedIndexChange)="tab.set($event)">
        <!-- ============ INFORMATIONS + ORGANIGRAMME ============ -->
        <mat-tab label="Informations">
          <div class="tabpad">
            <div class="card stack">
              <div class="form-grid">
                <div class="field"><label>Nom *</label><input [(ngModel)]="m.name" placeholder="Nom de l'entreprise" /></div>
                <div class="field"><label>Email de contact</label><input [(ngModel)]="m.email" type="email" placeholder="contact@..." /></div>
              </div>
              <div class="field"><label>Description</label><textarea [(ngModel)]="m.description" rows="3"></textarea></div>
              <div class="field">
                <label>Logo</label>
                @if (m.logo_url) { <div class="row" style="margin-bottom:.5rem"><img [src]="m.logo_url" alt="logo" style="height:48px" /></div> }
                <input type="file" accept="image/*" (change)="onLogo($event)" />
                <small>PNG/JPG. Utilisé dans les documents.</small>
              </div>
              <div class="form-grid">
                <div class="field"><label>Site web</label><input [(ngModel)]="m.website_url" placeholder="https://..." /></div>
                <div class="field"><label>Conditions générales (URL)</label><input [(ngModel)]="m.terms_url" placeholder="https://.../cgv" /></div>
              </div>
              <div class="form-grid">
                <div class="field"><label>Téléphone</label><input [(ngModel)]="m.phone" /></div>
                <div class="field"><label>Adresse</label><textarea [(ngModel)]="m.address" rows="2"></textarea></div>
              </div>
              <div class="field">
                <div class="row between"><label>Liens utiles</label><button class="btn btn-sm btn-ghost" (click)="addLink(m)">+ Ajouter</button></div>
                @for (link of m.useful_links; track $index) {
                  <div class="row" style="margin-bottom:.5rem">
                    <input [(ngModel)]="link.label" placeholder="Libellé" style="flex:1" />
                    <input [(ngModel)]="link.url" placeholder="https://..." style="flex:2" />
                    <button class="btn btn-sm btn-danger" (click)="removeLink(m, $index)">✕</button>
                  </div>
                }
                @if (!m.useful_links.length) { <small>Aucun lien. Cliquez sur « Ajouter ».</small> }
              </div>
            </div>

            <div class="card stack">
              <h3>Organigramme</h3>
              <p class="muted" style="margin:0">Reconstruit automatiquement à partir des équipes et de leurs liens hiérarchiques. Cliquez sur une équipe pour voir son détail.</p>
              <app-org-chart [teams]="teams()" />
            </div>
          </div>
        </mat-tab>

        <!-- ============ COLLABORATEURS ============ -->
        <mat-tab label="Collaborateurs ({{ collaborators().length }})">
          <div class="tabpad">
            <div class="card stack">
              <h3>Ajouter un collaborateur</h3>
              <div class="row wrap" style="gap:.5rem; align-items:end">
                <div class="field" style="margin:0"><label>Prénom</label><input [(ngModel)]="nc.first_name" /></div>
                <div class="field" style="margin:0"><label>Nom</label><input [(ngModel)]="nc.last_name" /></div>
                <div class="field" style="margin:0"><label>Fonction</label><input [(ngModel)]="nc.role" /></div>
                <div class="field" style="margin:0"><label>Email</label><input [(ngModel)]="nc.email" /></div>
                <button class="btn btn-primary" (click)="addCollaborator()">+ Ajouter</button>
              </div>
            </div>
            <div class="card">
              @if (collaborators().length) {
                <table>
                  <thead><tr><th>Collaborateur</th><th>Fonction</th><th>Email</th><th>Équipes</th><th></th></tr></thead>
                  <tbody>
                    @for (c of collaborators(); track c.id) {
                      <tr>
                        <td><span class="ava" [title]="c.full_name">{{ c.initials }}</span> <b>{{ c.full_name }}</b></td>
                        <td>{{ c.role || '—' }}</td>
                        <td>{{ c.email || '—' }}</td>
                        <td>
                          @for (t of c.team_names || []; track t) { <span class="chip">{{ t }}</span> }
                          @if (!(c.team_names || []).length) { <span class="muted">—</span> }
                        </td>
                        <td><button class="btn btn-sm btn-danger" (click)="removeCollaborator(c)">✕</button></td>
                      </tr>
                    }
                  </tbody>
                </table>
              } @else { <div class="muted">Aucun collaborateur pour l'instant.</div> }
            </div>
          </div>
        </mat-tab>

        <!-- ============ ÉQUIPES ============ -->
        <mat-tab label="Équipes ({{ teams().length }})">
          <div class="tabpad">
            <div class="card stack">
              <h3>Nouvelle équipe</h3>
              <div class="row wrap" style="gap:.5rem; align-items:end">
                <div class="field" style="margin:0; flex:1"><label>Nom</label><input [(ngModel)]="ntName" placeholder="ex : Équipe Développement" /></div>
                <div class="field" style="margin:0"><label>Couleur</label><input type="color" [(ngModel)]="ntColor" style="width:52px;height:36px;padding:2px" /></div>
                <div class="field" style="margin:0"><label>Équipe parente</label>
                  <select [(ngModel)]="ntParent">
                    <option [ngValue]="null">— aucune —</option>
                    @for (t of teams(); track t.id) { <option [ngValue]="t.id">{{ t.name }}</option> }
                  </select>
                </div>
                <button class="btn btn-primary" (click)="addTeam()">+ Créer</button>
              </div>
            </div>

            <div class="grid-cards">
              @for (t of teams(); track t.id) {
                <div class="card team-card" [style.--team]="t.color || '#38BDF8'">
                  <div class="row between">
                    <strong><span class="tdot"></span> {{ t.name }}</strong>
                    <a class="btn btn-sm btn-ghost" [routerLink]="['/teams', t.id]">Gérer →</a>
                  </div>
                  @if (t.parent_name) { <div class="tag">↳ sous-équipe de {{ t.parent_name }}</div> }
                  <p class="muted" style="min-height:2em; margin:.4rem 0">{{ t.description || 'Aucune description.' }}</p>
                  <div class="row" style="gap:.4rem; flex-wrap:wrap">
                    <span class="chip">{{ t.member_count }} collaborateur(s)</span>
                    <span class="chip">{{ t.project_count }} projet(s)</span>
                  </div>
                  <div class="row" style="margin-top:.6rem">
                    <button class="btn btn-sm btn-danger" (click)="removeTeam(t)">Supprimer</button>
                  </div>
                </div>
              } @empty { <div class="empty">Aucune équipe. Créez-en une ci-dessus.</div> }
            </div>
          </div>
        </mat-tab>

        <!-- ============ STYLES GLOBAUX (par type) ============ -->
        <mat-tab label="Styles par type">
          <div class="tabpad">
            <div class="card stack">
              <h3>Styles par défaut, par type de modèle</h3>
              <p class="muted" style="margin:0 0 .4rem">Chaque type de document possède ses propres styles par défaut. La « base commune » s'applique à tous, puis chaque type la surcharge. Héritage : <b>Base → Type → Projet → Modèle</b>.</p>
              <div class="type-pills">
                @for (dt of docTypes; track dt.key) {
                  <button class="type-pill" [class.active]="styleTab() === dt.key" (click)="styleTab.set(dt.key)">
                    <span>{{ dt.icon }}</span> {{ dt.label }}
                  </button>
                }
              </div>
              <app-style-editor [styles]="stylesFor(styleTab())" />
            </div>
          </div>
        </mat-tab>
      </mat-tab-group>
    }
  `,
  styles: [`
    .detail-tabs { margin-top: 1rem; }
    .tabpad { padding-top: 1.2rem; display:flex; flex-direction:column; gap:1rem; }
    .ava { display:inline-grid; place-items:center; width:26px; height:26px; border-radius:50%; font-size:.66rem; font-weight:700; color:#fff; background:linear-gradient(135deg,#38BDF8,#6366F1); margin-right:.4rem; vertical-align:middle; }
    .chip { display:inline-flex; align-items:center; font-size:.72rem; font-weight:600; background:var(--primary-050); color:var(--primary-dark); border-radius:999px; padding:.15rem .55rem; margin:.1rem .15rem 0 0; }
    .team-card .tdot { display:inline-block; width:10px; height:10px; border-radius:50%; background:var(--team); margin-right:.4rem; }
    .team-card { border-top:3px solid var(--team); }
    .type-pills { display:flex; flex-wrap:wrap; gap:.4rem; margin-bottom:.4rem; }
    .type-pill { border:1px solid var(--border-strong); background:var(--surface); border-radius:999px; padding:.35rem .8rem; cursor:pointer; font-weight:600; font-size:.82rem; display:flex; align-items:center; gap:.35rem; }
    .type-pill.active { background:var(--primary); color:#fff; border-color:var(--primary); }
  `],
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

  addLink(m: CompanyProfile) { m.useful_links.push({ label: '', url: '', order: m.useful_links.length }); }
  removeLink(m: CompanyProfile, i: number) { m.useful_links.splice(i, 1); }
  onLogo(event: Event) { this.logoFile = (event.target as HTMLInputElement).files?.[0] ?? null; }

  // ---- Collaborateurs ----
  addCollaborator() {
    if (!this.nc.first_name && !this.nc.last_name) { this.toast.error('Renseignez au moins le nom.'); return; }
    this.teamSvc.addMember({ ...this.nc }).subscribe({
      next: () => { this.nc = {}; this.toast.success('Collaborateur ajouté.'); this.reloadCollaborators(); },
      error: () => this.toast.error('Ajout impossible.'),
    });
  }
  removeCollaborator(c: TeamMember) {
    if (!confirm(`Retirer ${c.full_name} de l'entreprise ?`)) return;
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

  save() {
    const m = this.model();
    if (!m) return;
    this.saving.set(true);
    if (this.logoFile) {
      const fd = new FormData();
      for (const k of ['name', 'description', 'website_url', 'terms_url', 'address', 'phone', 'email'] as const) {
        fd.append(k, (m[k] as string) ?? '');
      }
      fd.append('styles', JSON.stringify(m.styles ?? {}));
      fd.append('logo', this.logoFile);
      this.service.updateWithLogo(fd).subscribe({ next: (c) => this.done(c), error: () => this.fail() });
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
