import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ClientService } from '../../core/services/client.service';
import { ToastService } from '../../core/services/api.service';
import { Client } from '../../core/models';

@Component({
  selector: 'app-client-list',
  imports: [FormsModule],
  template: `
    <div class="row between">
      <h1>Clients</h1>
      <button class="btn btn-primary" (click)="startNew()">+ Nouveau client</button>
    </div>
    <p class="muted">Gérez vos clients et rattachez-les à vos projets.</p>

    <div class="grid-2" style="display:grid;grid-template-columns:1fr 340px;gap:1rem;align-items:start">
      <div class="card">
        @if (clients().length) {
          <table>
            <thead><tr><th>Nom</th><th>Contact</th><th>Email</th><th>Projets</th><th></th></tr></thead>
            <tbody>
              @for (c of clients(); track c.id) {
                <tr>
                  <td><b>{{ c.name }}</b></td>
                  <td>{{ c.contact_name || '—' }}</td>
                  <td>{{ c.email || '—' }}</td>
                  <td>{{ c.project_count }}</td>
                  <td class="row" style="gap:.3rem">
                    <button class="btn btn-sm btn-ghost" (click)="edit(c)">Éditer</button>
                    <button class="btn btn-sm btn-danger" (click)="remove(c)">Suppr.</button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        } @else {
          <div class="muted" style="padding:1rem;text-align:center">Aucun client. Créez-en un.</div>
        }
      </div>

      @if (editing(); as m) {
        <div class="card stack">
          <h3>{{ m.id ? 'Modifier le client' : 'Nouveau client' }}</h3>
          <div class="field"><label>Nom *</label><input [(ngModel)]="m.name" /></div>
          <div class="field"><label>Contact principal</label><input [(ngModel)]="m.contact_name" /></div>
          <div class="field"><label>Email</label><input [(ngModel)]="m.email" /></div>
          <div class="field"><label>Téléphone</label><input [(ngModel)]="m.phone" /></div>
          <div class="field"><label>Adresse</label><textarea [(ngModel)]="m.address" rows="2"></textarea></div>
          <div class="field"><label>Notes</label><textarea [(ngModel)]="m.notes" rows="2"></textarea></div>
          <div class="row" style="gap:.5rem">
            <button class="btn btn-primary" (click)="save()">Enregistrer</button>
            <button class="btn btn-ghost" (click)="editing.set(null)">Annuler</button>
          </div>
        </div>
      }
    </div>
  `,
})
export class ClientList {
  private service = inject(ClientService);
  private toast = inject(ToastService);
  clients = signal<Client[]>([]);
  editing = signal<Client | null>(null);

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
