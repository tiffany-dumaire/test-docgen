import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiConfig, toHttpParams } from './api.service';
import {
  DiagramSeries,
  FormDiagram,
  FormSubmission,
  FormTemplate,
  OnlineForm,
  Paginated,
} from '../models';

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

  // ---- Diagrammes d'un formulaire (calculés à partir des réponses) ----
  diagramsData(id: number): Observable<{ count: number; diagrams: { config: FormDiagram; series: DiagramSeries }[] }> {
    return this.http.get<{ count: number; diagrams: { config: FormDiagram; series: DiagramSeries }[] }>(
      `${this.base}/forms/${id}/diagrams_data/`);
  }
  diagramUrl(id: number, diagramId: string, format: 'png' | 'svg', download = false): string {
    const dl = download ? '&download=1' : '';
    return `${this.base}/forms/${id}/diagram/?id=${encodeURIComponent(diagramId)}&fmt=${format}${dl}`;
  }
  diagramBlob(id: number, diagramId: string, format: 'png' | 'svg'): Observable<Blob> {
    return this.http.get(this.diagramUrl(id, diagramId, format), { responseType: 'blob' });
  }

  // ---- Modèles de formulaire ----
  templates(filters: Record<string, unknown> = {}): Observable<Paginated<FormTemplate>> {
    return this.http.get<Paginated<FormTemplate>>(`${this.base}/form-templates/`, {
      params: toHttpParams(filters),
    });
  }
  template(id: number): Observable<FormTemplate> {
    return this.http.get<FormTemplate>(`${this.base}/form-templates/${id}/`);
  }
  createTemplate(data: Partial<FormTemplate>): Observable<FormTemplate> {
    return this.http.post<FormTemplate>(`${this.base}/form-templates/`, data);
  }
  updateTemplate(id: number, data: Partial<FormTemplate>): Observable<FormTemplate> {
    return this.http.put<FormTemplate>(`${this.base}/form-templates/${id}/`, data);
  }
  removeTemplate(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/form-templates/${id}/`);
  }
  instantiate(id: number, body: { project?: number | null; title?: string }): Observable<OnlineForm> {
    return this.http.post<OnlineForm>(`${this.base}/form-templates/${id}/instantiate/`, body);
  }
  generateReport(id: number): Observable<{ document: { id: number }; detail: string }> {
    return this.http.post<{ document: { id: number }; detail: string }>(
      `${this.base}/forms/${id}/generate_report/`, {});
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
