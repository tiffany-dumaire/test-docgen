import { Component, inject, signal, Input } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
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
import { MeetingCalendar } from '../../shared/meeting-calendar';
import { RichTextEditor } from '../../shared/rich-text-editor';
import { ClientService } from '../../core/services/client.service';
import { ToastService } from '../../core/services/api.service';
import { Client, JournalEntry } from '../../core/models';

interface Bundle {
  client: any; projects: any[]; contacts: any[]; meetings: any[]; journal?: JournalEntry[];
}

@Component({
  selector: 'app-client-detail',
  imports: [
    RouterLink, FormsModule, DatePipe, MatTabsModule, MatTableModule,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatIconModule, MatButtonModule, MatTooltipModule, MeetingCalendar, RichTextEditor,
  ],
  template: `
    @if (creating()) {
      <div class="row between">
        <div class="row" style="gap:.8rem;align-items:center">
          <div class="avatar new"><mat-icon>person_add</mat-icon></div>
          <div>
            <h1 style="margin:0">Nouveau client</h1>
            <div class="muted">Renseignez les informations, puis créez la fiche.</div>
          </div>
        </div>
        <a mat-stroked-button routerLink="/clients"><mat-icon>arrow_back</mat-icon> Clients</a>
      </div>

      <mat-tab-group class="detail-tabs" animationDuration="200ms" mat-stretch-tabs="false">
        <mat-tab label="Informations">
          <div class="tabpad">
            @if (editing(); as m) {
              <div class="card stack">
                <h3>Informations du client</h3>
                <div class="logo-row">
                  <div class="logo-slot" (click)="ci.click()">
                    @if (m.logo_url) { <img [src]="m.logo_url" alt="logo" /> } @else { <mat-icon>add_photo_alternate</mat-icon> }
                  </div>
                  <div><div class="k">Logo du client</div>
                    <button mat-stroked-button type="button" (click)="ci.click()"><mat-icon>upload</mat-icon> Choisir une image</button></div>
                  <input #ci type="file" accept="image/*" hidden (change)="onLogo($event)" />
                </div>
                <div class="formgrid">
                  <mat-form-field appearance="outline"><mat-label>Nom</mat-label><input matInput [(ngModel)]="m.name" required /></mat-form-field>
                  <mat-form-field appearance="outline"><mat-label>Contact principal</mat-label><input matInput [(ngModel)]="m.contact_name" /></mat-form-field>
                  <mat-form-field appearance="outline"><mat-label>Email</mat-label><input matInput type="email" [(ngModel)]="m.email" /></mat-form-field>
                  <mat-form-field appearance="outline"><mat-label>Téléphone</mat-label><input matInput [(ngModel)]="m.phone" /></mat-form-field>
                  <mat-form-field appearance="outline" class="full"><mat-label>Adresse</mat-label><textarea matInput [(ngModel)]="m.address" rows="2"></textarea></mat-form-field>
                  <mat-form-field appearance="outline" class="full"><mat-label>Notes</mat-label><textarea matInput [(ngModel)]="m.notes" rows="3"></textarea></mat-form-field>
                </div>
                <div class="row" style="gap:.5rem">
                  <button mat-flat-button color="primary" (click)="saveEdit()"><mat-icon>save</mat-icon> Créer le client</button>
                  <a mat-stroked-button routerLink="/clients">Annuler</a>
                </div>
                <p class="muted" style="font-size:.82rem;margin:0">Les projets, contacts, réunions et le journal seront disponibles une fois la fiche créée.</p>
              </div>
            }
          </div>
        </mat-tab>
      </mat-tab-group>
    } @else if (data(); as b) {
      <div class="row between">
        <div class="row" style="gap:.8rem;align-items:center">
          @if (b.client.logo_url) { <img class="avatar-img" [src]="b.client.logo_url" alt="logo" /> }
          @else { <div class="avatar">{{ initials(b.client.name) }}</div> }
          <div>
            <h1 style="margin:0">{{ b.client.name }}</h1>
            <div class="muted">{{ b.client.contact_name || 'Client' }} · {{ b.projects.length }} projet(s)
              · {{ b.contacts.length }} contact(s) · {{ b.meetings.length }} réunion(s)</div>
          </div>
        </div>
        <div class="row" style="gap:.5rem">
          <button mat-flat-button color="primary" (click)="startEdit(b.client)"><mat-icon>edit</mat-icon> Modifier</button>
          <a mat-stroked-button routerLink="/clients"><mat-icon>arrow_back</mat-icon> Clients</a>
        </div>
      </div>

      <mat-tab-group class="detail-tabs" animationDuration="200ms" mat-stretch-tabs="false">
        <!-- INFORMATIONS -->
        <mat-tab label="Informations">
          <div class="tabpad">
            @if (editing(); as m) {
              <div class="card stack">
                <h3>Modifier la fiche client</h3>
                <div class="logo-row">
                  <div class="logo-slot" (click)="ce.click()">
                    @if (m.logo_url) { <img [src]="m.logo_url" alt="logo" /> } @else { <mat-icon>add_photo_alternate</mat-icon> }
                  </div>
                  <div><div class="k">Logo du client</div>
                    <button mat-stroked-button type="button" (click)="ce.click()"><mat-icon>upload</mat-icon> Choisir une image</button></div>
                  <input #ce type="file" accept="image/*" hidden (change)="onLogo($event)" />
                </div>
                <div class="formgrid">
                  <mat-form-field appearance="outline"><mat-label>Nom</mat-label><input matInput [(ngModel)]="m.name" /></mat-form-field>
                  <mat-form-field appearance="outline"><mat-label>Contact principal</mat-label><input matInput [(ngModel)]="m.contact_name" /></mat-form-field>
                  <mat-form-field appearance="outline"><mat-label>Email</mat-label><input matInput type="email" [(ngModel)]="m.email" /></mat-form-field>
                  <mat-form-field appearance="outline"><mat-label>Téléphone</mat-label><input matInput [(ngModel)]="m.phone" /></mat-form-field>
                  <mat-form-field appearance="outline" class="full"><mat-label>Adresse</mat-label><textarea matInput [(ngModel)]="m.address" rows="2"></textarea></mat-form-field>
                  <mat-form-field appearance="outline" class="full"><mat-label>Notes</mat-label><textarea matInput [(ngModel)]="m.notes" rows="3"></textarea></mat-form-field>
                </div>
                <div class="row" style="gap:.5rem">
                  <button mat-flat-button color="primary" (click)="saveEdit()"><mat-icon>save</mat-icon> Enregistrer</button>
                  <button mat-stroked-button (click)="editing.set(null)">Annuler</button>
                </div>
              </div>
            } @else {
              <div class="card infogrid">
                <div><span class="k">Nom</span><span class="v">{{ b.client.name }}</span></div>
                <div><span class="k">Contact principal</span><span class="v">{{ b.client.contact_name || '—' }}</span></div>
                <div><span class="k">Email</span><span class="v">@if (b.client.email) { <a [href]="'mailto:' + b.client.email">{{ b.client.email }}</a> } @else { — }</span></div>
                <div><span class="k">Téléphone</span><span class="v">{{ b.client.phone || '—' }}</span></div>
                <div class="full"><span class="k">Adresse</span><span class="v" style="white-space:pre-line">{{ b.client.address || '—' }}</span></div>
                <div class="full"><span class="k">Notes</span><span class="v" style="white-space:pre-line">{{ b.client.notes || '—' }}</span></div>
                <div><span class="k">Créé le</span><span class="v">{{ b.client.created_at ? (b.client.created_at | date:'dd/MM/yyyy') : '—' }}</span></div>
                <div><span class="k">Modifié le</span><span class="v">{{ b.client.updated_at ? (b.client.updated_at | date:'dd/MM/yyyy HH:mm') : '—' }}</span></div>
              </div>
            }
          </div>
        </mat-tab>

        <!-- PROJETS (détail par sous-onglet) -->
        <mat-tab [label]="'Projets (' + b.projects.length + ')'">
          <div class="tabpad">
            @if (b.projects.length) {
              <mat-tab-group class="sub-tabs" animationDuration="150ms" mat-stretch-tabs="false">
                @for (p of b.projects; track p.id) {
                  <mat-tab [label]="p.name">
                    <div class="subpad">
                      <div class="row between">
                        <div class="muted">Réf. {{ p.reference || '—' }} · Statut : {{ statusLabel(p.status) }}</div>
                        <a mat-stroked-button [routerLink]="['/projects', p.id]"><mat-icon>open_in_new</mat-icon> Ouvrir le projet</a>
                      </div>
                      @if (p.description) { <div class="card">{{ p.description }}</div> }
                      <div class="grid2">
                        <div class="card"><h3>🛠️ Équipe</h3>
                          @if (p.assignments?.length) {
                            @for (a of p.assignments; track a.id) {
                              <div class="rowline"><b>{{ a.member_name }}</b><span class="muted">{{ a.role || '—' }} · {{ a.team_name }}</span></div>
                            }
                          } @else { <div class="muted">Aucun membre.</div> }
                        </div>
                        <div class="card"><h3>📄 Documents</h3>
                          <div class="muted">{{ p.document_count || 0 }} document(s)</div>
                          <a class="mini" [routerLink]="['/projects', p.id]">Voir le détail →</a>
                        </div>
                      </div>
                    </div>
                  </mat-tab>
                }
              </mat-tab-group>
            } @else { <div class="muted">Aucun projet rattaché à ce client.</div> }
          </div>
        </mat-tab>

        <!-- CONTACTS -->
        <mat-tab [label]="'Contacts (' + b.contacts.length + ')'">
          <div class="tabpad">
            <div class="tablecard">
              <table mat-table [dataSource]="b.contacts">
                <ng-container matColumnDef="name"><th mat-header-cell *matHeaderCellDef>Nom</th><td mat-cell *matCellDef="let c"><b>{{ c.full_name }}</b></td></ng-container>
                <ng-container matColumnDef="kind"><th mat-header-cell *matHeaderCellDef>Type</th><td mat-cell *matCellDef="let c">{{ c.kind === 'client' ? 'Client' : 'Interne' }}</td></ng-container>
                <ng-container matColumnDef="role"><th mat-header-cell *matHeaderCellDef>Fonction</th><td mat-cell *matCellDef="let c">{{ c.role || '—' }}</td></ng-container>
                <ng-container matColumnDef="email"><th mat-header-cell *matHeaderCellDef>Email</th><td mat-cell *matCellDef="let c">{{ c.email || '—' }}</td></ng-container>
                <ng-container matColumnDef="project"><th mat-header-cell *matHeaderCellDef>Projet</th><td mat-cell *matCellDef="let c">{{ c.project_name }}</td></ng-container>
                <tr mat-header-row *matHeaderRowDef="contactCols"></tr>
                <tr mat-row *matRowDef="let row; columns: contactCols"></tr>
              </table>
              @if (!b.contacts.length) { <div class="muted pad">Aucun contact.</div> }
            </div>
          </div>
        </mat-tab>

        <!-- RÉUNIONS (calendrier filtrable) -->
        <mat-tab [label]="'Réunions (' + b.meetings.length + ')'">
          <div class="tabpad">
            <div class="filters">
              <mat-form-field appearance="outline">
                <mat-label>Projet</mat-label>
                <mat-select [(ngModel)]="fProject">
                  <mat-option [value]="0">Tous</mat-option>
                  @for (p of b.projects; track p.id) { <mat-option [value]="p.id">{{ p.name }}</mat-option> }
                </mat-select>
              </mat-form-field>
              <mat-form-field appearance="outline"><mat-label>À partir du</mat-label><input matInput type="date" [(ngModel)]="fFrom" /></mat-form-field>
              <mat-form-field appearance="outline"><mat-label>Jusqu'au</mat-label><input matInput type="date" [(ngModel)]="fTo" /></mat-form-field>
              <button mat-icon-button (click)="resetFilters()" matTooltip="Réinitialiser"><mat-icon>filter_alt_off</mat-icon></button>
            </div>
            <app-meeting-calendar [meetings]="filteredMeetings()" />
            <div class="tablecard">
              <table mat-table [dataSource]="filteredMeetings()">
                <ng-container matColumnDef="date"><th mat-header-cell *matHeaderCellDef>Date</th>
                  <td mat-cell *matCellDef="let m">{{ m.date ? (m.date | date:'dd/MM/yyyy HH:mm') : '—' }}</td></ng-container>
                <ng-container matColumnDef="title"><th mat-header-cell *matHeaderCellDef>Réunion</th><td mat-cell *matCellDef="let m"><b>{{ m.title }}</b></td></ng-container>
                <ng-container matColumnDef="project"><th mat-header-cell *matHeaderCellDef>Projet</th><td mat-cell *matCellDef="let m">{{ m.project_name }}</td></ng-container>
                <ng-container matColumnDef="location"><th mat-header-cell *matHeaderCellDef>Lieu / lien</th><td mat-cell *matCellDef="let m">{{ m.location || '—' }}</td></ng-container>
                <tr mat-header-row *matHeaderRowDef="meetingCols"></tr>
                <tr mat-row *matRowDef="let row; columns: meetingCols"></tr>
              </table>
              @if (!filteredMeetings().length) { <div class="muted pad">Aucune réunion sur ce filtre.</div> }
            </div>
          </div>
        </mat-tab>

        <!-- JOURNAL -->
        <mat-tab [label]="'Journal (' + journal().length + ')'">
          <div class="tabpad">
            <div class="card"><h3>📓 Journal du client</h3>
              <p class="muted" style="margin-top:-.4rem">Événements de tous les projets du client + entrées manuelles.</p>
              <div class="jform">
                <div class="row" style="gap:.3rem;flex-wrap:wrap;align-items:center;margin-bottom:.4rem">
                  <select [(ngModel)]="njCat" style="width:130px"><option value="note">Note</option><option value="decision">Décision</option><option value="risk">Risque</option><option value="action">Action</option><option value="incident">Incident</option><option value="info">Info</option></select>
                  <select [(ngModel)]="njConf" style="width:170px"><option value="public">Public</option><option value="internal">Interne</option><option value="confidential">Confidentiel</option><option value="restricted">Strictement confidentiel</option></select>
                </div>
                <app-rich-text-editor [(value)]="njHtml" />
                <div class="row" style="justify-content:flex-end;margin-top:.4rem">
                  <button mat-flat-button color="primary" [disabled]="!hasContent(njHtml)" (click)="addJournal()">+ Ajouter au journal</button>
                </div>
              </div>
              <label class="muted" style="font-size:.8rem;display:flex;gap:.3rem;align-items:center;margin:.5rem 0">
                <input type="checkbox" [(ngModel)]="showAuto" /> Afficher les entrées automatiques
              </label>
              <div class="timeline">
              @for (j of visibleJournal(); track j.id) {
                <div class="jentry" [class.auto]="j.is_automatic" [style.--jc]="catColor(j)">
                  <div class="jicon">{{ eventIcon(j) }}</div>
                  <div class="jbody">
                    <div class="jmeta">
                      <span class="badge">{{ j.category_label || j.category }}</span>
                      @if (j.is_automatic) { <span class="chip-auto">auto</span> }
                      @if (j.project_name) { <span class="chip-proj">{{ j.project_name }}</span> }
                      <span class="muted jdate">{{ j.author || '—' }} · {{ j.created_at | date:'dd/MM/yyyy HH:mm' }}</span>
                    </div>
                    @if (j.body_html) { <div class="rich" [innerHTML]="j.body_html"></div> } @else { <div>{{ j.body }}</div> }
                  </div>
                </div>
              } @empty { <div class="muted">Aucune entrée.</div> }
              </div>
            </div>
          </div>
        </mat-tab>
      </mat-tab-group>
    } @else { <div class="muted">Chargement…</div> }
  `,
  styles: [`
    .detail-tabs { margin-top: 1rem; } .tabpad { padding-top: 1.2rem; display: flex; flex-direction: column; gap: 1rem; }
    .sub-tabs { border: 1px solid var(--mat-sys-outline-variant); border-radius: 14px; overflow: hidden; }
    .subpad { padding: 1.2rem; display: flex; flex-direction: column; gap: 1rem; }
    .infogrid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem 2rem; }
    .infogrid .full { grid-column: 1 / -1; }
    .infogrid .k { display: block; font-size: .72rem; text-transform: uppercase; letter-spacing: .04em; color: var(--mat-sys-outline); font-weight: 700; }
    .infogrid .v { font-size: 1rem; }
    .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    @media (max-width: 760px) { .infogrid, .grid2 { grid-template-columns: 1fr; } }
    .rowline { display: flex; justify-content: space-between; padding: .3rem 0; border-bottom: 1px solid var(--mat-sys-outline-variant); }
    .tablecard { background: var(--mat-sys-surface); border: 1px solid var(--mat-sys-outline-variant); border-radius: 16px; overflow: hidden; box-shadow: var(--shadow); }
    table { width: 100%; background: transparent; } .pad { padding: 1.5rem; text-align: center; }
    .filters { display: flex; gap: 1rem; align-items: center; flex-wrap: wrap; }
    .filters mat-form-field { width: 200px; }
    .mini { font-size: .8rem; }
    .avatar { width: 3rem; height: 3rem; border-radius: 50%; background: var(--primary, #ec6608); color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 1.1rem; }
    .avatar.new { background: var(--mat-sys-secondary-container); color: var(--mat-sys-on-secondary-container); }
    .avatar-img { width: 3rem; height: 3rem; border-radius: 12px; object-fit: contain; background: #fff; border: 1px solid var(--mat-sys-outline-variant); }
    .logo-row { display: flex; align-items: center; gap: 1rem; margin-bottom: .3rem; }
    .logo-slot { width: 72px; height: 72px; border-radius: 14px; border: 1px dashed var(--mat-sys-outline); display: grid; place-items: center; cursor: pointer; overflow: hidden; background: var(--mat-sys-surface-container-low); flex: none; }
    .logo-slot img { width: 100%; height: 100%; object-fit: contain; }
    .logo-row .k { font-size: .72rem; text-transform: uppercase; letter-spacing: .04em; color: var(--mat-sys-outline); font-weight: 700; margin-bottom: .3rem; }
    .formgrid { display: grid; grid-template-columns: 1fr 1fr; gap: 0 1rem; }
    .formgrid .full { grid-column: 1 / -1; } .formgrid mat-form-field { width: 100%; }
    @media (max-width: 760px) { .formgrid { grid-template-columns: 1fr; } }
    .stack { display: flex; flex-direction: column; gap: .3rem; }
    .jform { border: 1px solid var(--mat-sys-outline-variant); border-radius: 10px; padding: .6rem; margin-bottom: .6rem; }
    .timeline { position: relative; margin-top: .4rem; }
    .timeline::before { content: ''; position: absolute; left: 15px; top: 6px; bottom: 6px; width: 2px; background: var(--mat-sys-outline-variant); }
    .jentry { display: flex; gap: .7rem; align-items: flex-start; padding: .5rem 0; position: relative; }
    .jentry.auto .jbody { color: var(--mat-sys-outline); }
    .jicon { width: 32px; height: 32px; flex: none; display: flex; align-items: center; justify-content: center; border-radius: 50%; font-size: .95rem;
      background: color-mix(in srgb, var(--jc, var(--mat-sys-primary)) 18%, var(--mat-sys-surface)); box-shadow: 0 0 0 4px var(--mat-sys-surface); position: relative; z-index: 1; }
    .jbody { flex: 1; min-width: 0; background: var(--mat-sys-surface); border: 1px solid var(--mat-sys-outline-variant); border-left: 3px solid var(--jc, var(--mat-sys-outline-variant)); border-radius: 10px; padding: .5rem .7rem; }
    .jmeta { display: flex; gap: .4rem; align-items: center; flex-wrap: wrap; margin-bottom: .15rem; }
    .jdate { font-size: .72rem; }
    .badge { font-size: .68rem; text-transform: uppercase; letter-spacing: .03em; background: var(--mat-sys-surface-variant, #eee); border-radius: 6px; padding: .05rem .4rem; font-weight: 700; }
    .chip-auto { font-size: .62rem; text-transform: uppercase; background: var(--mat-sys-outline-variant); color: var(--mat-sys-outline); border-radius: 6px; padding: .05rem .35rem; font-weight: 700; }
    .chip-proj { font-size: .68rem; background: var(--primary, #ec6608); color: #fff; border-radius: 6px; padding: .05rem .4rem; }
    .rich :is(h1,h2,h3){ margin:.3em 0; font-size:1rem; } .rich ul,.rich ol{ margin:.2em 0 .2em 1.1em; } .rich p{ margin:.25em 0; }
  `],
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
        this.editing.set({ name: '', contact_name: '', email: '', phone: '', address: '', notes: '' } as Client);
      } else {
        this.reload();
      }
    });
  }

  reload() {
    this.service.detailBundle(+this.id!).subscribe((b) => {
      this.data.set(b);
      this.journal.set(b.journal || []);
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
    if (f && m) m.logo_url = URL.createObjectURL(f);
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
    if (j.is_automatic && j.event) return ClientDetail.EVENT_ICONS[j.event] || 'ℹ️';
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
    if (j.is_automatic && j.event && byEvent[j.event]) return byEvent[j.event];
    return ({ note: '#5B5A55', decision: '#2F6B45', risk: '#B04A12', action: '#2E5E8E',
              incident: '#A1202A', info: '#2D6E7E', event: '#5B4F8A' } as Record<string, string>)[j.category] || '#5B5A55';
  }
  hasContent(html: string) { return !!html && html.replace(/<[^>]*>/g, '').trim().length > 0; }
  visibleJournal() {
    return this.showAuto ? this.journal() : this.journal().filter((j) => !j.is_automatic);
  }
  addJournal() {
    if (!this.hasContent(this.njHtml)) return;
    this.service.addJournal(+this.id!, { category: this.njCat, confidentiality: this.njConf, body_html: this.njHtml })
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
