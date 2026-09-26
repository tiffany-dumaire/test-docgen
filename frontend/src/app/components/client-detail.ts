import { Component, inject, signal, Input } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { BackDirective } from '@shared/back.directive';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MeetingCalendar } from '@shared/meeting-calendar';
import { RichTextEditor } from '@shared/rich-text-editor';
import { ClientService } from '@core/services/client.service';
import { ToastService } from '@core/services/api.service';
import { Client, ClientSerializer, JournalEntry, JournalEntrySerializer } from '@core/models';

interface Bundle {
  client: Client; projects: any[]; contacts: any[]; meetings: any[]; journal?: JournalEntry[];
}

@Component({
  selector: 'app-client-detail',
  imports: [
    RouterLink, FormsModule, DatePipe, MatTabsModule, MatTableModule,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatIconModule, MatButtonModule, MatTooltipModule, MeetingCalendar, RichTextEditor, BackDirective,
  ],
  templateUrl: './client-detail.html',
  styleUrl: './client-detail.scss',
})
export class ClientDetail {
  private service = inject(ClientService);
  private toast = inject(ToastService);
  private router = inject(Router);
  @Input() id?: string;
  creating = () => !this.id;
  data = signal<Bundle | null>(null);
  journal = signal<JournalEntry[]>([]);
  editing = signal<Client | null>(null);
  contactCols = ['name', 'kind', 'role', 'email', 'project'];
  meetingCols = ['date', 'title', 'project', 'location'];
  fProject = 0; fFrom = ''; fTo = '';
  njCat = 'note'; njConf = 'internal'; njHtml = '';
  showAuto = true;

  private static EVENT_ICONS: Record<string, string> = {
    document_created: '📄', version_created: '🔄', form_added: '📝',
    form_response: '📥', meeting_added: '📅', meeting_cancelled: '🚫',
    contact_added: '➕', contact_removed: '➖', project_added: '📁',
    team_updated: '🛠️', contact_changed: '✏️',
  };

  constructor() {
    setTimeout(() => {
      if (this.creating()) {
        this.editing.set({ name: '', contactName: '', email: '', phone: '', address: '', notes: '' } as Client);
      } else {
        this.reload();
      }
    });
  }

  reload() {
    this.service.detailBundle(+this.id!).subscribe((b) => {
      const bundle: Bundle = {
        ...b,
        client: ClientSerializer.fromApi(b.client),
        journal: (b.journal || []).map(JournalEntrySerializer.fromApi),
      };
      this.data.set(bundle);
      this.journal.set(bundle.journal ?? []);
    });
  }

  initials(name: string) {
    return (name || '?').split(/\s+/).filter(Boolean).slice(0, 2)
      .map((w) => w[0].toUpperCase()).join('');
  }
  private logoFile: File | null = null;
  onLogo(ev: Event) {
    const f = (ev.target as HTMLInputElement).files?.[0] ?? null;
    this.logoFile = f;
    const m = this.editing();
    if (f && m) m.logoUrl = URL.createObjectURL(f);
  }
  startEdit(c: any) { this.logoFile = null; this.editing.set({ ...c }); }
  saveEdit() {
    const m = this.editing();
    if (!m || !m.name?.trim()) { this.toast.error('Le nom est requis.'); return; }
    if (this.creating()) {
      this.service.create(m).subscribe({
        next: (c) => this.afterSave(c.id!, 'Client créé.', true),
        error: () => this.toast.error('Création impossible.'),
      });
      return;
    }
    this.service.update(m.id!, m).subscribe({
      next: () => this.afterSave(m.id!, 'Fiche client mise à jour.', false),
      error: () => this.toast.error('Enregistrement impossible.'),
    });
  }
  private afterSave(id: number, msg: string, navigate: boolean) {
    const finish = () => {
      this.toast.success(msg); this.logoFile = null;
      if (navigate) this.router.navigate(['/clients', id]);
      else { this.editing.set(null); this.reload(); }
    };
    if (this.logoFile) this.service.uploadLogo(id, this.logoFile).subscribe({ next: finish, error: finish });
    else finish();
  }

  eventIcon(j: JournalEntry): string {
    if (j.isAutomatic && j.event) return ClientDetail.EVENT_ICONS[j.event] || 'ℹ️';
    return ({ note: '🗒️', decision: '✅', risk: '⚠️', action: '⚡',
              incident: '🔥', info: 'ℹ️', event: '•' } as Record<string, string>)[j.category] || '🗒️';
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
  hasContent(html: string) { return !!html && html.replace(/<[^>]*>/g, '').trim().length > 0; }
  visibleJournal() {
    return this.showAuto ? this.journal() : this.journal().filter((j) => !j.isAutomatic);
  }
  addJournal() {
    if (!this.hasContent(this.njHtml)) return;
    this.service.addJournal(+this.id!, { category: this.njCat, confidentiality: this.njConf, bodyHtml: this.njHtml })
      .subscribe(() => { this.njHtml = ''; this.reload(); });
  }

  filteredMeetings() {
    const b = this.data(); if (!b) return [];
    return b.meetings.filter((m: any) => {
      if (this.fProject && m.project !== this.fProject) return false;
      if (this.fFrom && m.date && m.date.slice(0, 10) < this.fFrom) return false;
      if (this.fTo && m.date && m.date.slice(0, 10) > this.fTo) return false;
      return true;
    });
  }
  resetFilters() { this.fProject = 0; this.fFrom = ''; this.fTo = ''; }
  statusLabel(s: string) {
    return ({ active: 'Actif', on_hold: 'En pause', archived: 'Archivé' } as Record<string, string>)[s] ?? s;
  }
}
