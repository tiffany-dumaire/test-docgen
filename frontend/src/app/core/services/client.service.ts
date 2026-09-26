import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiConfig, toHttpParams } from './api.service';
import { Client, JournalEntry, Paginated } from '../models';
import { ClientInterface, JournalEntryInterface } from '../interfaces';
import { ClientSerializer, JournalEntrySerializer, serializePaginated } from '../serializers';

@Injectable({ providedIn: 'root' })
export class ClientService {
  private http = inject(HttpClient);
  private cfg = inject(ApiConfig);
  private url = `${this.cfg.base}/projects/clients/`;

  list(filters: Record<string, unknown> = {}): Observable<Paginated<Client>> {
    return this.http.get<Paginated<ClientInterface>>(this.url, { params: toHttpParams(filters) })
      .pipe(map((p) => serializePaginated(p, ClientSerializer.fromApi)));
  }
  get(id: number): Observable<Client> {
    return this.http.get<ClientInterface>(`${this.url}${id}/`).pipe(map(ClientSerializer.fromApi));
  }
  create(data: Partial<Client>): Observable<Client> {
    return this.http.post<ClientInterface>(this.url, ClientSerializer.toApi(data)).pipe(map(ClientSerializer.fromApi));
  }
  update(id: number, data: Partial<Client>): Observable<Client> {
    return this.http.put<ClientInterface>(`${this.url}${id}/`, ClientSerializer.toApi(data)).pipe(map(ClientSerializer.fromApi));
  }
  remove(id: number): Observable<void> { return this.http.delete<void>(`${this.url}${id}/`); }
  uploadLogo(id: number, file: File): Observable<Client> {
    const fd = new FormData(); fd.append('logo', file);
    return this.http.patch<ClientInterface>(`${this.url}${id}/`, fd).pipe(map(ClientSerializer.fromApi));
  }
  detailBundle(id: number): Observable<any> { return this.http.get<any>(`${this.url}${id}/detail_bundle/`); }
  journal(id: number): Observable<JournalEntry[]> {
    return this.http.get<JournalEntryInterface[]>(`${this.url}${id}/journal/`)
      .pipe(map((rows) => rows.map(JournalEntrySerializer.fromApi)));
  }
  addJournal(id: number, entry: Partial<JournalEntry>): Observable<JournalEntry> {
    return this.http.post<JournalEntryInterface>(`${this.url}${id}/journal/`, JournalEntrySerializer.toApi(entry))
      .pipe(map(JournalEntrySerializer.fromApi));
  }
}
