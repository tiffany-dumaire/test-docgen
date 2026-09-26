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
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { DocumentService } from '@core/services/document.service';
import { ToastService } from '@core/services/api.service';
import { AuthService } from '@core/auth/auth.service';
import { PreviewService } from '@core/services/preview.service';
import { ProjectDocument } from '@core/models';

@Component({
  selector: 'app-document-list',
  imports: [
    RouterLink, FormsModule, MatTableModule, MatSortModule, MatPaginatorModule,
    MatFormFieldModule, MatInputModule, MatIconModule, MatButtonModule, MatTooltipModule,
    TranslocoModule,
  ],
  templateUrl: './document-list.html',
  styleUrl: './document-list.scss',
})
export class DocumentList implements AfterViewInit {
  private service = inject(DocumentService);
  private toast = inject(ToastService);
  private previewSvc = inject(PreviewService);
  private t = inject(TranslocoService);
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
    this.toast.success(this.t.translate('documents.previewing'));
    this.service.preview(d.id!).subscribe({ next: (r) => this.previewSvc.open(r, d.title), error: () => this.toast.error(this.t.translate('documents.preview_error')) });
  }
  duplicate(d: ProjectDocument) {
    this.service.duplicateDocument(d.id!).subscribe({ next: () => { this.toast.success(this.t.translate('documents.duplicated')); this.reload(); }, error: () => this.toast.error(this.t.translate('documents.duplicate_error')) });
  }
  remove(d: ProjectDocument) {
    if (!confirm(this.t.translate('documents.confirm_delete', { title: d.title }))) return;
    this.service.remove(d.id!).subscribe(() => { this.toast.success(this.t.translate('documents.deleted')); this.reload(); });
  }
}
