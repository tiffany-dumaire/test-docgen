import { Component, inject, signal, viewChild, effect, AfterViewInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ProjectService } from '../../core/services/project.service';
import { ToastService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { Project } from '../../core/models';

@Component({
  selector: 'app-project-list',
  imports: [
    RouterLink, FormsModule, MatTableModule, MatSortModule, MatPaginatorModule,
    MatFormFieldModule, MatInputModule, MatIconModule, MatButtonModule, MatChipsModule, MatTooltipModule,
  ],
  template: `
    <div class="row between">
      <h1>Projets</h1>
      <a mat-flat-button color="primary" routerLink="/projects/new"><mat-icon>add</mat-icon> Nouveau projet</a>
    </div>

    <mat-form-field appearance="outline" class="search">
      <mat-label>Rechercher</mat-label>
      <mat-icon matPrefix>search</mat-icon>
      <input matInput [(ngModel)]="search" (ngModelChange)="reload()" placeholder="Projet, client…" />
    </mat-form-field>

    <div class="tablecard">
      <table mat-table [dataSource]="ds" matSort>
        <ng-container matColumnDef="name">
          <th mat-header-cell *matHeaderCellDef mat-sort-header>Projet</th>
          <td mat-cell *matCellDef="let p"><a [routerLink]="['/projects', p.id]" class="strong">{{ p.name }}</a></td>
        </ng-container>
        <ng-container matColumnDef="client_name">
          <th mat-header-cell *matHeaderCellDef mat-sort-header>Client</th>
          <td mat-cell *matCellDef="let p">{{ p.client_name }}</td>
        </ng-container>
        <ng-container matColumnDef="reference">
          <th mat-header-cell *matHeaderCellDef mat-sort-header>Référence</th>
          <td mat-cell *matCellDef="let p">{{ p.reference || '—' }}</td>
        </ng-container>
        <ng-container matColumnDef="status">
          <th mat-header-cell *matHeaderCellDef mat-sort-header>Statut</th>
          <td mat-cell *matCellDef="let p"><span class="chip" [class]="'st-' + p.status">{{ statusLabel(p.status) }}</span></td>
        </ng-container>
        <ng-container matColumnDef="document_count">
          <th mat-header-cell *matHeaderCellDef mat-sort-header>Docs</th>
          <td mat-cell *matCellDef="let p">{{ p.document_count }}</td>
        </ng-container>
        <ng-container matColumnDef="actions">
          <th mat-header-cell *matHeaderCellDef></th>
          <td mat-cell *matCellDef="let p" class="actions">
            <a mat-icon-button [routerLink]="['/projects', p.id, 'edit']" matTooltip="Éditer"><mat-icon>edit</mat-icon></a>
            @if (canManage()) { <button mat-icon-button (click)="remove(p)" matTooltip="Supprimer"><mat-icon>delete</mat-icon></button> }
          </td>
        </ng-container>
        <tr mat-header-row *matHeaderRowDef="cols"></tr>
        <tr mat-row *matRowDef="let row; columns: cols"></tr>
      </table>
      @if (!ds.data.length) { <div class="empty">Aucun projet. Créez-en un pour commencer.</div> }
      <mat-paginator [pageSizeOptions]="[10, 25, 50]" pageSize="10" showFirstLastButtons />
    </div>
  `,
  styles: [`
    .search { width: 340px; max-width: 100%; margin: .5rem 0 1rem; }
    .tablecard { background: var(--mat-sys-surface); border: 1px solid var(--mat-sys-outline-variant); border-radius: 16px; overflow: hidden; box-shadow: var(--shadow); }
    table { width: 100%; background: transparent; }
    .strong { font-weight: 600; }
    .actions { text-align: right; white-space: nowrap; }
    .chip { display: inline-block; padding: .15rem .6rem; border-radius: 999px; font-size: .72rem; font-weight: 700; }
    .st-active { background: #dcfce7; color: #15803d; }
    .st-on_hold { background: #ffedd5; color: #c2410c; }
    .st-archived { background: #e2e8f0; color: #475569; }
    .empty { padding: 2.5rem; text-align: center; color: var(--mat-sys-outline); }
  `],
})
export class ProjectList implements AfterViewInit {
  private service = inject(ProjectService);
  private toast = inject(ToastService);
  auth = inject(AuthService);

  ds = new MatTableDataSource<Project>([]);
  cols = ['name', 'client_name', 'reference', 'status', 'document_count', 'actions'];
  search = '';
  sort = viewChild(MatSort);
  paginator = viewChild(MatPaginator);

  constructor() {
    this.reload();
    effect(() => {
      const s = this.sort(); const pg = this.paginator();
      if (s) this.ds.sort = s;
      if (pg) this.ds.paginator = pg;
    });
  }
  ngAfterViewInit() {
    const s = this.sort(); const pg = this.paginator();
    if (s) this.ds.sort = s;
    if (pg) this.ds.paginator = pg;
  }

  canManage() { return this.auth.hasRole('admin') || this.auth.hasRole('manager') || !this.auth.user(); }

  reload() {
    this.service.list({ search: this.search }).subscribe((r) => (this.ds.data = r.results));
  }
  statusLabel(s: string) {
    return ({ active: 'Actif', on_hold: 'En pause', archived: 'Archivé' } as Record<string, string>)[s] ?? s;
  }
  remove(p: Project) {
    if (!confirm(`Supprimer le projet « ${p.name} » et ses documents ?`)) return;
    this.service.remove(p.id!).subscribe(() => { this.toast.success('Projet supprimé.'); this.reload(); });
  }
}
