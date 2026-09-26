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
import { ClientService } from '@core/services/client.service';
import { ToastService } from '@core/services/api.service';
import { Client } from '@core/models';

@Component({
  selector: 'app-client-list',
  imports: [FormsModule, RouterLink, MatTableModule, MatFormFieldModule, MatInputModule, MatIconModule, MatButtonModule, MatTooltipModule, TranslocoModule],
  templateUrl: './client-list.html',
  styleUrl: './client-list.scss',
})
export class ClientList {
  private service = inject(ClientService);
  private toast = inject(ToastService);
  private t = inject(TranslocoService);
  clients = signal<Client[]>([]);
  cols = ['name', 'contact', 'email', 'projects', 'actions'];

  constructor() { this.reload(); }

  reload() { this.service.list().subscribe((r) => this.clients.set(r.results)); }

  remove(c: Client) {
    if (!confirm(this.t.translate('clients.confirm_delete', { name: c.name }))) return;
    this.service.remove(c.id!).subscribe({
      next: () => { this.toast.success(this.t.translate('clients.deleted')); this.reload(); },
      error: () => this.toast.error(this.t.translate('clients.delete_error')),
    });
  }
}
