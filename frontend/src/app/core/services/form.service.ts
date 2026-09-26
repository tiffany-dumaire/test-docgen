import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiConfig, toHttpParams } from './api.service';
import {
  DiagramSeries,
  FormDiagram,
  FormSubmission,
  FormTemplate,
  OnlineForm,
  Paginated,
} from '../models';
import { OnlineFormInterface, FormTemplateInterface, FormSubmissionInterface } from '../interfaces';
import {
  OnlineFormSerializer, FormTemplateSerializer, FormSubmissionSerializer, serializePaginated,
} from '../serializers';

@Injectable({ providedIn: 'root' })
export class FormService {
  private http = inject(HttpClient);
  private cfg = inject(ApiConfig);
  private base = `${this.cfg.base}/forms`;

  list(filters: Record<string, unknown> = {}): Observable<Paginated<OnlineForm>> {
    return this.http.get<Paginated<OnlineFormInterface>>(`${this.base}/forms/`, {
      params: toHttpParams(filters),
    }).pipe(map((p) => serializePaginated(p, OnlineFormSerializer.fromApi)));
  }
  get(id: number): Observable<OnlineForm> {
    return this.http.get<OnlineFormInterface>(`${this.base}/forms/${id}/`).pipe(map(OnlineFormSerializer.fromApi));
  }
  create(data: Partial<OnlineForm>): Observable<OnlineForm> {
    return this.http.post<OnlineFormInterface>(`${this.base}/forms/`, OnlineFormSerializer.toApi(data)).pipe(map(OnlineFormSerializer.fromApi));
  }
  update(id: number, data: Partial<OnlineForm>): Observable<OnlineForm> {
    return this.http.put<OnlineFormInterface>(`${this.base}/forms/${id}/`, OnlineFormSerializer.toApi(data)).pipe(map(OnlineFormSerializer.fromApi));
  }
  remove(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/forms/${id}/`);
  }
  submissions(id: number): Observable<FormSubmission[]> {
    return this.http.get<FormSubmissionInterface[]>(`${this.base}/forms/${id}/submissions/`)
      .pipe(map((rows) => rows.map(FormSubmissionSerializer.fromApi)));
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
    return this.http.get<Paginated<FormTemplateInterface>>(`${this.base}/form-templates/`, {
      params: toHttpParams(filters),
    }).pipe(map((p) => serializePaginated(p, FormTemplateSerializer.fromApi)));
  }
  template(id: number): Observable<FormTemplate> {
    return this.http.get<FormTemplateInterface>(`${this.base}/form-templates/${id}/`).pipe(map(FormTemplateSerializer.fromApi));
  }
  createTemplate(data: Partial<FormTemplate>): Observable<FormTemplate> {
    return this.http.post<FormTemplateInterface>(`${this.base}/form-templates/`, FormTemplateSerializer.toApi(data)).pipe(map(FormTemplateSerializer.fromApi));
  }
  updateTemplate(id: number, data: Partial<FormTemplate>): Observable<FormTemplate> {
    return this.http.put<FormTemplateInterface>(`${this.base}/form-templates/${id}/`, FormTemplateSerializer.toApi(data)).pipe(map(FormTemplateSerializer.fromApi));
  }
  removeTemplate(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/form-templates/${id}/`);
  }
  instantiate(id: number, body: { project?: number | null; title?: string }): Observable<OnlineForm> {
    return this.http.post<OnlineFormInterface>(`${this.base}/form-templates/${id}/instantiate/`, body).pipe(map(OnlineFormSerializer.fromApi));
  }
  generateReport(id: number): Observable<{ document: { id: number }; detail: string }> {
    return this.http.post<{ document: { id: number }; detail: string }>(
      `${this.base}/forms/${id}/generate_report/`, {});
  }

  // Téléversement d'un fichier réutilisable dans l'éditeur (image, modèle).
  uploadAsset(file: File): Observable<{ id: number; url: string; name: string }> {
    const fd = new FormData();
    fd.append('file', file);
    return this.http.post<{ id: number; url: string; name: string }>(`${this.base}/assets/`, fd);
  }

  // Endpoints publics (par code de lien réduit)
  publicForm(code: string): Observable<OnlineForm> {
    return this.http.get<OnlineFormInterface>(`${this.base}/public/${code}/`).pipe(map(OnlineFormSerializer.fromApi));
  }
  submit(code: string, data: Record<string, unknown>): Observable<{ detail: string }> {
    return this.http.post<{ detail: string }>(`${this.base}/public/${code}/submit/`, {
      data,
    });
  }
  publicUpload(code: string, field: string, file: File): Observable<{ id: number; url: string; name: string }> {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('field', field);
    return this.http.post<{ id: number; url: string; name: string }>(`${this.base}/public/${code}/upload/`, fd);
  }
}
