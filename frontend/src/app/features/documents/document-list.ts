import { Component, inject, viewChild, effect, AfterViewInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DocumentService } from '../../core/services/document.service';
import { ToastService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { PreviewService } from '../../core/services/preview.service';
import { ProjectDocument } from '../../core/models';

@Component({
  selector: 'app-document-list',
  imports: [
    RouterLink, FormsModule, MatTableModule, MatSortModule, MatPaginatorModule,
    MatFormFieldModule, MatInputModule, MatIconModule, MatButtonModule, MatTooltipModule,
  ],
  template: `
    <div class="row between">
      <h1>Documents</h1>
      <a mat-flat-button color="primary" routerLink="/documents/new"><mat-icon>add</mat-icon> Nouveau document</a>
    </div>

    <mat-form-field appearance="outline" class="search">
      <mat-label>Rechercher</mat-label>
      <mat-icon matPrefix>search</mat-icon>
      <input matInput [(ngModel)]="search" (ngModelChange)="reload()" placeholder="Titre du document…" />
    </mat-form-field>

    <div class="tablecard">
      <table mat-table [dataSource]="ds" matSort>
        <ng-container matColumnDef="title">
          <th mat-header-cell *matHeaderCellDef mat-sort-header>Titre</th>
          <td mat-cell *matCellDef="let d"><a [routerLink]="['/documents', d.id]" class="strong">{{ d.title }}</a></td>
        </ng-container>
        <ng-container matColumnDef="project_name">
          <th mat-header-cell *matHeaderCellDef mat-sort-header>Projet</th>
          <td mat-cell *matCellDef="let d">{{ d.project_name }}</td>
        </ng-container>
        <ng-container matColumnDef="doc_type">
          <th mat-header-cell *matHeaderCellDef mat-sort-header>Type</th>
          <td mat-cell *matCellDef="let d"><span class="ty">{{ d.doc_type }}</span></td>
        </ng-container>
        <ng-container matColumnDef="confidentiality">
          <th mat-header-cell *matHeaderCellDef mat-sort-header>Confidentialité</th>
          <td mat-cell *matCellDef="let d"><span class="chip" [class]="'cf-' + d.confidentiality">{{ d.confidentiality_display }}</span></td>
        </ng-container>
        <ng-container matColumnDef="current_version">
          <th mat-header-cell *matHeaderCellDef mat-sort-header>Ver.</th>
          <td mat-cell *matCellDef="let d">v{{ d.current_version }}</td>
        </ng-container>
        <ng-container matColumnDef="actions">
          <th mat-header-cell *matHeaderCellDef></th>
          <td mat-cell *matCellDef="let d" class="actions">
            <button mat-icon-button (click)="preview(d)" matTooltip="Aperçu"><mat-icon>visibility</mat-icon></button>
            <a mat-icon-button [routerLink]="['/documents', d.id]" matTooltip="Ouvrir"><mat-icon>open_in_new</mat-icon></a>
            <button mat-icon-button (click)="duplicate(d)" matTooltip="Dupliquer"><mat-icon>content_copy</mat-icon></button>
            @if (canManage()) { <button mat-icon-button (click)="remove(d)" matTooltip="Supprimer"><mat-icon>delete</mat-icon></button> }
          </td>
        </ng-container>
        <tr mat-header-row *matHeaderRowDef="cols"></tr>
        <tr mat-row *matRowDef="let row; columns: cols"></tr>
      </table>
      @if (!ds.data.length) { <div class="empty">Aucun document. Créez-en un pour commencer.</div> }
      <mat-paginator [pageSizeOptions]="[10, 25, 50]" pageSize="10" showFirstLastButtons />
    </div>
  `,
  styles: [`
    .search { width: 340px; max-width: 100%; margin: .5rem 0 1rem; }
    .tablecard { background: var(--mat-sys-surface); border: 1px solid var(--mat-sys-outline-variant); border-radius: 16px; overflow: hidden; box-shadow: var(--shadow); }
    table { width: 100%; background: transparent; }
    .strong { font-weight: 600; }
    .actions { text-align: right; white-space: nowrap; }
    .ty { text-transform: uppercase; font-size: .7rem; font-weight: 700; background: var(--mat-sys-surface-container-high); padding: .12rem .5rem; border-radius: 6px; }
    .chip { display: inline-block; padding: .15rem .6rem; border-radius: 999px; font-size: .72rem; font-weight: 700; }
    .cf-public { background: #dcfce7; color: #15803d; } .cf-internal { background: #dbeafe; color: #1d4ed8; }
    .cf-confidential { background: #ffedd5; color: #c2410c; } .cf-restricted { background: #fee2e2; color: #b91c1c; }
    .empty { padding: 2.5rem; text-align: center; color: var(--mat-sys-outline); }
  `],
})
export class DocumentList implements AfterViewInit {
  private service = inject(DocumentService);
  private toast = inject(ToastService);
  private previewSvc = inject(PreviewService);
  auth = inject(AuthService);

  ds = new MatTableDataSource<ProjectDocument>([]);
  cols = ['title', 'project_name', 'doc_type', 'confidentiality', 'current_version', 'actions'];
  search = '';
  sort = viewChild(MatSort);
  paginator = viewChild(MatPaginator);

  constructor() {
    this.reload();
    effect(() => { const s = this.sort(); const pg = this.paginator(); if (s) this.ds.sort = s; if (pg) this.ds.paginator = pg; });
  }
  ngAfterViewInit() { const s = this.sort(); const pg = this.paginator(); if (s) this.ds.sort = s; if (pg) this.ds.paginator = pg; }

  canManage() { return this.auth.hasRole('admin') || this.auth.hasRole('manager') || !this.auth.user(); }
  reload() { this.service.list({ search: this.search }).subscribe((r) => (this.ds.data = r.results)); }
  preview(d: ProjectDocument) {
    this.toast.success('Génération de l\'aperçu…');
    this.service.preview(d.id!).subscribe({ next: (r) => this.previewSvc.open(r, d.title), error: () => this.toast.error('Aperçu impossible.') });
  }
  duplicate(d: ProjectDocument) {
    this.service.duplicateDocument(d.id!).subscribe({ next: () => { this.toast.success('Document dupliqué.'); this.reload(); }, error: () => this.toast.error('Duplication impossible.') });
  }
  remove(d: ProjectDocument) {
    if (!confirm(`Supprimer « ${d.title} » et toutes ses versions ?`)) return;
    this.service.remove(d.id!).subscribe(() => { this.toast.success('Document supprimé.'); this.reload(); });
  }
}
