import { Component, inject, signal, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { MatTabsModule } from '@angular/material/tabs';
import { MeetingCalendar } from '@shared/meeting-calendar';
import { RichTextEditor } from '@shared/rich-text-editor';
import { ProjectTracking } from '@shared/project-tracking';
import { ProjectExtrasService } from '@core/services/project-extras.service';
import { Meeting, JournalEntry, ProjectLink } from '@core/models';
import { MembershipService, Membership } from '@core/services/membership.service';
import { RouterLink } from '@angular/router';
import { ProjectService } from '@core/services/project.service';
import { DocumentService } from '@core/services/document.service';
import { FormService } from '@core/services/form.service';
import { FormTemplate, OnlineForm, Project, ProjectDocument } from '@core/models';
import { ToastService } from '@core/services/api.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-project-detail',
  imports: [RouterLink, FormsModule, DatePipe, MatTabsModule, MeetingCalendar, RichTextEditor, ProjectTracking],
  templateUrl: './project-detail.html',
  styleUrl: './project-detail.scss',
})
export class ProjectDetail {
  private projects = inject(ProjectService);
  private documentsSvc = inject(DocumentService);
  private formsSvc = inject(FormService);
  private membershipSvc = inject(MembershipService);
  private extras = inject(ProjectExtrasService);
  private toast = inject(ToastService);
  private router = inject(Router);

  @Input() id!: string;
  project = signal<Project | null>(null);
  documents = signal<ProjectDocument[]>([]);
  forms = signal<OnlineForm[]>([]);
  formTemplates = signal<FormTemplate[]>([]);
  selTemplate: number | null = null;
  members = signal<Membership[]>([]);
  users = signal<{ id?: number; full_name?: string; email: string }[]>([]);
  newUser: number | null = null;
  newRoles = '';
  links = signal<ProjectLink[]>([]);
  meetings = signal<Meeting[]>([]);
  journal = signal<JournalEntry[]>([]);
  nlCat='Sharepoint'; nlCatSel='Sharepoint'; nlName=''; nlUrl=''; nlComment='';
  linkCategories = ['Conditions générales', 'Site web', 'Support', 'Sharepoint', 'Gitlab', 'Teamwork'];
  onNlCat(v: string) { this.nlCatSel = v; this.nlCat = v === '__custom' ? '' : v; }
  nmTitle=''; nmLoc=''; nmDate='';
  njCat='note'; njConf='internal'; njHtml='';
  showAuto = true;

  private static EVENT_ICONS: Record<string, string> = {
    document_created: '📄', version_created: '🔄', form_added: '📝',
    form_response: '📥', meeting_added: '📅', meeting_cancelled: '🚫',
    contact_added: '➕', contact_removed: '➖', project_added: '📁',
    team_updated: '🛠️', contact_changed: '✏️',
  };
  eventIcon(j: JournalEntry): string {
    if (j.isAutomatic && j.event) return ProjectDetail.EVENT_ICONS[j.event] || 'ℹ️';
    return ({ note: '🗒️', decision: '✅', risk: '⚠️', action: '⚡',
              incident: '🔥', info: 'ℹ️', event: '•' } as Record<string, string>)[j.category] || '🗒️';
  }
  cfDisplay(p: any, def: { key: string; type?: string }): string {
    const v = (p.customFields || {})[def.key];
    if (v === undefined || v === null || v === '') return '—';
    if (def.type === 'boolean') return v ? 'Oui' : 'Non';
    return String(v);
  }
  styleEntries(p: any): { key: string; color?: string; font?: string; size?: number; bold?: boolean }[] {
    const styles = p.styles || {};
    const out: { key: string; color?: string; font?: string; size?: number; bold?: boolean }[] = [];
    for (const [key, val] of Object.entries(styles)) {
      if (val && typeof val === 'object') {
        const o = val as any;
        out.push({ key, color: o.color, font: o.font, size: o.size, bold: o.bold });
      }
    }
    return out;
  }
  repoUrl(url?: string): string {
    if (!url) return '#';
    return /^https?:\/\//.test(url) ? url : 'https://' + url;
  }
  /** Aplati l'arborescence des dépôts en une liste ordonnée {repo, depth}. */
  repoTree(repos: import('@core/models').ProjectRepo[]): { repo: import('@core/models').ProjectRepo; depth: number }[] {
    const byParent = new Map<string, import('@core/models').ProjectRepo[]>();
    const ids = new Set(repos.map((r) => r.id));
    for (const r of repos) {
      const key = r.parent && ids.has(r.parent) ? r.parent : '__root__';
      (byParent.get(key) ?? byParent.set(key, []).get(key)!).push(r);
    }
    const out: { repo: import('@core/models').ProjectRepo; depth: number }[] = [];
    const seen = new Set<string>();
    const walk = (key: string, depth: number) => {
      for (const r of byParent.get(key) ?? []) {
        if (seen.has(r.id)) continue;
        seen.add(r.id);
        out.push({ repo: r, depth });
        walk(r.id, depth + 1);
      }
    };
    walk('__root__', 0);
    for (const r of repos) if (!seen.has(r.id)) out.push({ repo: r, depth: 0 });  // sécurité
    return out;
  }
  instUrl(inst: { url?: string; domain?: string; ip?: string }): string {
    if (inst.url) return /^https?:\/\//.test(inst.url) ? inst.url : 'https://' + inst.url;
    if (inst.domain) return /^https?:\/\//.test(inst.domain) ? inst.domain : 'https://' + inst.domain;
    if (inst.ip) return 'http://' + inst.ip;
    return '#';
  }
  catColor(j: JournalEntry): string {
    const byEvent: Record<string, string> = {
      document_created: '#2E5E8E', version_created: '#2E6B55', form_added: '#6B3F6E',
      form_response: '#2D6E7E', meeting_added: '#806A2E', meeting_cancelled: '#A32638',
      contact_added: '#2F6B45', contact_removed: '#A32638', project_added: '#5B4F8A',
      team_updated: '#A34E2A', contact_changed: '#806A2E',
    };
    if (j.isAutomatic && j.event && byEvent[j.event]) return byEvent[j.event];
    return ({ note: '#5B5A55', decision: '#2F6B45', risk: '#B04A12', action: '#2E5E8E',
              incident: '#A1202A', info: '#2D6E7E', event: '#5B4F8A' } as Record<string, string>)[j.category] || '#5B5A55';
  }
  hasContent(html: string): boolean {
    return !!html && html.replace(/<[^>]*>/g, '').trim().length > 0;
  }
  visibleJournal(): JournalEntry[] {
    const all = this.journal();
    return this.showAuto ? all : all.filter((j) => !j.isAutomatic);
  }

  constructor() {
    setTimeout(() => {
      const pid = +this.id;
      this.projects.get(pid).subscribe((p) => this.project.set(p));
      this.documentsSvc.list({ project: pid }).subscribe((r) => this.documents.set(r.results));
      this.formsSvc.list({ project: pid }).subscribe((r) => this.forms.set(r.results));
      this.formsSvc.templates({ project: pid }).subscribe((r) => this.formTemplates.set(r.results));
      this.loadMembers(pid);
      this.membershipSvc.users().subscribe((r) => this.users.set(r.results));
      this.reloadExtras(pid);
    });
  }

  genForm(p: Project) {
    if (!this.selTemplate) return;
    const ft = this.formTemplates().find((t) => t.id === this.selTemplate);
    this.formsSvc.instantiate(this.selTemplate, { project: p.id, title: ft?.name })
      .subscribe({
        next: (form) => { this.toast.success('Formulaire généré depuis le modèle.'); this.router.navigate(['/forms', form.id]); },
        error: () => this.toast.error('Génération impossible.'),
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
  cancelMeeting(m: Meeting) {
    if (!m.id) return;
    if (!confirm(`Annuler la réunion « ${m.title} » ?`)) return;
    this.extras.updateMeeting(m.id, { cancelled: true }).subscribe(() => this.reloadExtras(+this.id));
  }
  addJournal(pid: number) {
    if (!this.hasContent(this.njHtml)) return;
    this.extras.addJournal({ project: pid, category: this.njCat, confidentiality: this.njConf, bodyHtml: this.njHtml }).subscribe(() => {
      this.njHtml=''; this.reloadExtras(pid); });
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
