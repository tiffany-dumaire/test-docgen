import { Component, inject, signal, Input } from '@angular/core';
import { RouterLink } from '@angular/router';
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
import { ClientService } from '../../core/services/client.service';

interface Bundle {
  client: any; projects: any[]; contacts: any[]; meetings: any[];
}

@Component({
  selector: 'app-client-detail',
  imports: [
    RouterLink, FormsModule, DatePipe, MatTabsModule, MatTableModule,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatIconModule, MatButtonModule, MatTooltipModule,
  ],
  template: `
    @if (data(); as b) {
      <div class="row between">
        <div>
          <h1>{{ b.client.name }}</h1>
          <div class="muted">{{ b.client.contact_name || 'Client' }} · {{ b.projects.length }} projet(s)</div>
        </div>
        <a mat-stroked-button routerLink="/clients"><mat-icon>arrow_back</mat-icon> Clients</a>
      </div>

      <mat-tab-group class="detail-tabs" animationDuration="200ms" mat-stretch-tabs="false">
        <!-- INFORMATIONS -->
        <mat-tab label="Informations">
          <div class="tabpad">
            <div class="card infogrid">
              <div><span class="k">Nom</span><span class="v">{{ b.client.name }}</span></div>
              <div><span class="k">Contact principal</span><span class="v">{{ b.client.contact_name || '—' }}</span></div>
              <div><span class="k">Email</span><span class="v">{{ b.client.email || '—' }}</span></div>
              <div><span class="k">Téléphone</span><span class="v">{{ b.client.phone || '—' }}</span></div>
              <div class="full"><span class="k">Adresse</span><span class="v">{{ b.client.address || '—' }}</span></div>
              <div class="full"><span class="k">Notes</span><span class="v">{{ b.client.notes || '—' }}</span></div>
            </div>
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
  `],
})
export class ClientDetail {
  private service = inject(ClientService);
  @Input() id!: string;
  data = signal<Bundle | null>(null);
  contactCols = ['name', 'kind', 'role', 'email', 'project'];
  meetingCols = ['date', 'title', 'project', 'location'];
  fProject = 0; fFrom = ''; fTo = '';

  constructor() {
    setTimeout(() => this.service.detailBundle(+this.id).subscribe((b) => this.data.set(b)));
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
