import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ClientService } from '../../core/services/client.service';
import { ToastService } from '../../core/services/api.service';
import { Client } from '../../core/models';

@Component({
  selector: 'app-client-list',
  imports: [FormsModule, MatTableModule, MatFormFieldModule, MatInputModule, MatIconModule, MatButtonModule, MatTooltipModule],
  template: `
    <div class="row between">
      <h1>Clients</h1>
      <button mat-flat-button color="primary" (click)="startNew()"><mat-icon>add</mat-icon> Nouveau client</button>
    </div>
    <p class="muted">Gérez vos clients et rattachez-les à vos projets.</p>

    <div class="grid-2" style="display:grid;grid-template-columns:1fr 340px;gap:1rem;align-items:start">
      <div class="tablecard">
        <table mat-table [dataSource]="clients()">
          <ng-container matColumnDef="name"><th mat-header-cell *matHeaderCellDef>Nom</th><td mat-cell *matCellDef="let c"><b>{{ c.name }}</b></td></ng-container>
          <ng-container matColumnDef="contact"><th mat-header-cell *matHeaderCellDef>Contact</th><td mat-cell *matCellDef="let c">{{ c.contact_name || '—' }}</td></ng-container>
          <ng-container matColumnDef="email"><th mat-header-cell *matHeaderCellDef>Email</th><td mat-cell *matCellDef="let c">{{ c.email || '—' }}</td></ng-container>
          <ng-container matColumnDef="projects"><th mat-header-cell *matHeaderCellDef>Projets</th><td mat-cell *matCellDef="let c">{{ c.project_count }}</td></ng-container>
          <ng-container matColumnDef="actions"><th mat-header-cell *matHeaderCellDef></th>
            <td mat-cell *matCellDef="let c" style="text-align:right;white-space:nowrap">
              <button mat-icon-button (click)="edit(c)" matTooltip="Éditer"><mat-icon>edit</mat-icon></button>
              <button mat-icon-button (click)="remove(c)" matTooltip="Supprimer"><mat-icon>delete</mat-icon></button>
            </td></ng-container>
          <tr mat-header-row *matHeaderRowDef="cols"></tr>
          <tr mat-row *matRowDef="let row; columns: cols"></tr>
        </table>
        @if (!clients().length) { <div class="muted" style="padding:1.5rem;text-align:center">Aucun client. Créez-en un.</div> }
      </div>

      @if (editing(); as m) {
        <div class="card stack editpanel">
          <h3>{{ m.id ? 'Modifier le client' : 'Nouveau client' }}</h3>
          <mat-form-field appearance="outline"><mat-label>Nom *</mat-label><input matInput [(ngModel)]="m.name" /></mat-form-field>
          <mat-form-field appearance="outline"><mat-label>Contact principal</mat-label><input matInput [(ngModel)]="m.contact_name" /></mat-form-field>
          <mat-form-field appearance="outline"><mat-label>Email</mat-label><input matInput [(ngModel)]="m.email" /></mat-form-field>
          <mat-form-field appearance="outline"><mat-label>Téléphone</mat-label><input matInput [(ngModel)]="m.phone" /></mat-form-field>
          <mat-form-field appearance="outline"><mat-label>Adresse</mat-label><textarea matInput [(ngModel)]="m.address" rows="2"></textarea></mat-form-field>
          <mat-form-field appearance="outline"><mat-label>Notes</mat-label><textarea matInput [(ngModel)]="m.notes" rows="2"></textarea></mat-form-field>
          <div class="row" style="gap:.5rem">
            <button mat-flat-button color="primary" (click)="save()">Enregistrer</button>
            <button mat-stroked-button (click)="editing.set(null)">Annuler</button>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`.tablecard{background:var(--mat-sys-surface);border:1px solid var(--mat-sys-outline-variant);border-radius:16px;overflow:hidden;box-shadow:var(--shadow)} table{width:100%;background:transparent} .editpanel mat-form-field{width:100%}`],
})
export class ClientList {
  private service = inject(ClientService);
  private toast = inject(ToastService);
  clients = signal<Client[]>([]);
  editing = signal<Client | null>(null);
  cols = ['name', 'contact', 'email', 'projects', 'actions'];

  constructor() { this.reload(); }

  reload() { this.service.list().subscribe((r) => this.clients.set(r.results)); }
  startNew() { this.editing.set({ name: '' }); }
  edit(c: Client) { this.editing.set({ ...c }); }

  save() {
    const m = this.editing();
    if (!m || !m.name.trim()) { this.toast.error('Le nom est obligatoire.'); return; }
    const req = m.id ? this.service.update(m.id, m) : this.service.create(m);
    req.subscribe({
      next: () => { this.toast.success('Client enregistré.'); this.editing.set(null); this.reload(); },
      error: () => this.toast.error('Enregistrement impossible.'),
    });
  }

  remove(c: Client) {
    if (!confirm(`Supprimer le client « ${c.name} » ?`)) return;
    this.service.remove(c.id!).subscribe({
      next: () => { this.toast.success('Client supprimé.'); this.reload(); },
      error: () => this.toast.error('Suppression impossible.'),
    });
  }
}
