import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiConfig, toHttpParams } from './api.service';
import { FormSubmission, OnlineForm, Paginated } from '../models';

@Injectable({ providedIn: 'root' })
export class FormService {
  private http = inject(HttpClient);
  private cfg = inject(ApiConfig);
  private base = `${this.cfg.base}/forms`;

  list(filters: Record<string, unknown> = {}): Observable<Paginated<OnlineForm>> {
    return this.http.get<Paginated<OnlineForm>>(`${this.base}/forms/`, {
      params: toHttpParams(filters),
    });
  }
  get(id: number): Observable<OnlineForm> {
    return this.http.get<OnlineForm>(`${this.base}/forms/${id}/`);
  }
  create(data: Partial<OnlineForm>): Observable<OnlineForm> {
    return this.http.post<OnlineForm>(`${this.base}/forms/`, data);
  }
  update(id: number, data: Partial<OnlineForm>): Observable<OnlineForm> {
    return this.http.put<OnlineForm>(`${this.base}/forms/${id}/`, data);
  }
  remove(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/forms/${id}/`);
  }
  submissions(id: number): Observable<FormSubmission[]> {
    return this.http.get<FormSubmission[]>(`${this.base}/forms/${id}/submissions/`);
  }

  // Endpoints publics (par code de lien réduit)
  publicForm(code: string): Observable<OnlineForm> {
    return this.http.get<OnlineForm>(`${this.base}/public/${code}/`);
  }
  submit(code: string, data: Record<string, unknown>): Observable<{ detail: string }> {
    return this.http.post<{ detail: string }>(`${this.base}/public/${code}/submit/`, {
      data,
    });
  }
}
