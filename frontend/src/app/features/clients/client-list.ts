import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { ClientService } from '../../core/services/client.service';
import { ToastService } from '../../core/services/api.service';
import { Client } from '../../core/models';

@Component({
  selector: 'app-client-list',
  imports: [FormsModule, RouterLink, MatTableModule, MatFormFieldModule, MatInputModule, MatIconModule, MatButtonModule, MatTooltipModule, TranslocoModule],
  template: `
    <div class="row between">
      <h1>{{ 'nav.clients' | transloco }}</h1>
      <button mat-flat-button color="primary" (click)="startNew()"><mat-icon>add</mat-icon> {{ 'clients.new' | transloco }}</button>
    </div>
    <p class="muted">{{ 'clients.subtitle' | transloco }}</p>

    <div class="grid-2" style="display:grid;grid-template-columns:1fr 340px;gap:1rem;align-items:start">
      <div class="tablecard">
        <table mat-table [dataSource]="clients()">
          <ng-container matColumnDef="name"><th mat-header-cell *matHeaderCellDef>{{ 'clients.col_name' | transloco }}</th><td mat-cell *matCellDef="let c"><a [routerLink]="['/clients', c.id]" class="strong">{{ c.name }}</a></td></ng-container>
          <ng-container matColumnDef="contact"><th mat-header-cell *matHeaderCellDef>{{ 'clients.col_contact' | transloco }}</th><td mat-cell *matCellDef="let c">{{ c.contact_name || '—' }}</td></ng-container>
          <ng-container matColumnDef="email"><th mat-header-cell *matHeaderCellDef>{{ 'clients.col_email' | transloco }}</th><td mat-cell *matCellDef="let c">{{ c.email || '—' }}</td></ng-container>
          <ng-container matColumnDef="projects"><th mat-header-cell *matHeaderCellDef>{{ 'nav.projects' | transloco }}</th><td mat-cell *matCellDef="let c">{{ c.project_count }}</td></ng-container>
          <ng-container matColumnDef="actions"><th mat-header-cell *matHeaderCellDef></th>
            <td mat-cell *matCellDef="let c" style="text-align:right;white-space:nowrap">
              <a mat-icon-button [routerLink]="['/clients', c.id]" [matTooltip]="'clients.detail' | transloco"><mat-icon>visibility</mat-icon></a>
              <button mat-icon-button (click)="edit(c)" [matTooltip]="'common.edit' | transloco"><mat-icon>edit</mat-icon></button>
              <button mat-icon-button (click)="remove(c)" [matTooltip]="'common.delete' | transloco"><mat-icon>delete</mat-icon></button>
            </td></ng-container>
          <tr mat-header-row *matHeaderRowDef="cols"></tr>
          <tr mat-row *matRowDef="let row; columns: cols"></tr>
        </table>
        @if (!clients().length) { <div class="muted" style="padding:1.5rem;text-align:center">{{ 'clients.empty' | transloco }}</div> }
      </div>

      @if (editing(); as m) {
        <div class="card stack editpanel">
          <h3>{{ (m.id ? 'clients.edit' : 'clients.new') | transloco }}</h3>
          <mat-form-field appearance="outline"><mat-label>{{ 'clients.f_name' | transloco }}</mat-label><input matInput [(ngModel)]="m.name" /></mat-form-field>
          <mat-form-field appearance="outline"><mat-label>{{ 'clients.f_contact' | transloco }}</mat-label><input matInput [(ngModel)]="m.contact_name" /></mat-form-field>
          <mat-form-field appearance="outline"><mat-label>{{ 'clients.col_email' | transloco }}</mat-label><input matInput [(ngModel)]="m.email" /></mat-form-field>
          <mat-form-field appearance="outline"><mat-label>{{ 'clients.f_phone' | transloco }}</mat-label><input matInput [(ngModel)]="m.phone" /></mat-form-field>
          <mat-form-field appearance="outline"><mat-label>{{ 'clients.f_address' | transloco }}</mat-label><textarea matInput [(ngModel)]="m.address" rows="2"></textarea></mat-form-field>
          <mat-form-field appearance="outline"><mat-label>{{ 'clients.f_notes' | transloco }}</mat-label><textarea matInput [(ngModel)]="m.notes" rows="2"></textarea></mat-form-field>
          <div class="row" style="gap:.5rem">
            <button mat-flat-button color="primary" (click)="save()">{{ 'common.save' | transloco }}</button>
            <button mat-stroked-button (click)="editing.set(null)">{{ 'common.cancel' | transloco }}</button>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`.tablecard{background:var(--mat-sys-surface);border:1px solid var(--mat-sys-outline-variant);border-radius:16px;overflow:hidden;box-shadow:var(--shadow)} table{width:100%;background:transparent} .editpanel mat-form-field{width:100%} .strong{font-weight:600}`],
})
export class ClientList {
  private service = inject(ClientService);
  private toast = inject(ToastService);
  private t = inject(TranslocoService);
  clients = signal<Client[]>([]);
  editing = signal<Client | null>(null);
  cols = ['name', 'contact', 'email', 'projects', 'actions'];

  constructor() { this.reload(); }

  reload() { this.service.list().subscribe((r) => this.clients.set(r.results)); }
  startNew() { this.editing.set({ name: '' }); }
  edit(c: Client) { this.editing.set({ ...c }); }

  save() {
    const m = this.editing();
    if (!m || !m.name.trim()) { this.toast.error(this.t.translate('clients.name_required')); return; }
    const req = m.id ? this.service.update(m.id, m) : this.service.create(m);
    req.subscribe({
      next: () => { this.toast.success(this.t.translate('clients.saved')); this.editing.set(null); this.reload(); },
      error: () => this.toast.error(this.t.translate('clients.save_error')),
    });
  }

  remove(c: Client) {
    if (!confirm(this.t.translate('clients.confirm_delete', { name: c.name }))) return;
    this.service.remove(c.id!).subscribe({
      next: () => { this.toast.success(this.t.translate('clients.deleted')); this.reload(); },
      error: () => this.toast.error(this.t.translate('clients.delete_error')),
    });
  }
}
