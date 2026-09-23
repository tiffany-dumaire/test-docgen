import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiConfig, toHttpParams } from './api.service';
import { Client, Paginated } from '../models';

@Injectable({ providedIn: 'root' })
export class ClientService {
  private http = inject(HttpClient);
  private cfg = inject(ApiConfig);
  private url = `${this.cfg.base}/projects/clients/`;

  list(filters: Record<string, unknown> = {}): Observable<Paginated<Client>> {
    return this.http.get<Paginated<Client>>(this.url, { params: toHttpParams(filters) });
  }
  get(id: number): Observable<Client> { return this.http.get<Client>(`${this.url}${id}/`); }
  create(data: Partial<Client>): Observable<Client> { return this.http.post<Client>(this.url, data); }
  update(id: number, data: Partial<Client>): Observable<Client> {
    return this.http.put<Client>(`${this.url}${id}/`, data);
  }
  remove(id: number): Observable<void> { return this.http.delete<void>(`${this.url}${id}/`); }
}
