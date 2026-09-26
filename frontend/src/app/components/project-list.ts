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
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { ProjectService } from '@core/services/project.service';
import { ToastService } from '@core/services/api.service';
import { AuthService } from '@core/auth/auth.service';
import { Project } from '@core/models';

@Component({
  selector: 'app-project-list',
  imports: [
    RouterLink, FormsModule, MatTableModule, MatSortModule, MatPaginatorModule,
    MatFormFieldModule, MatInputModule, MatIconModule, MatButtonModule, MatChipsModule, MatTooltipModule,
    TranslocoModule,
  ],
  templateUrl: './project-list.html',
  styleUrl: './project-list.scss',
})
export class ProjectList implements AfterViewInit {
  private service = inject(ProjectService);
  private toast = inject(ToastService);
  private t = inject(TranslocoService);
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
    const key = ({ active: 'projects.status.active', on_hold: 'projects.status.on_hold',
      archived: 'projects.status.archived' } as Record<string, string>)[s];
    return key ? this.t.translate(key) : s;
  }
  remove(p: Project) {
    if (!confirm(this.t.translate('projects.confirm_delete', { name: p.name }))) return;
    this.service.remove(p.id!).subscribe(() => { this.toast.success(this.t.translate('projects.deleted')); this.reload(); });
  }
}
