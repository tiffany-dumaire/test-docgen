import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiConfig, toHttpParams } from './api.service';
import {
  Choices,
  DocumentTemplate,
  DocumentVersion,
  GeneratePayload,
  Paginated,
  ProjectDocument,
} from '../models';

@Injectable({ providedIn: 'root' })
export class DocumentService {
  private http = inject(HttpClient);
  private cfg = inject(ApiConfig);
  private base = `${this.cfg.base}/documents`;

  // Documents
  list(filters: Record<string, unknown> = {}): Observable<Paginated<ProjectDocument>> {
    return this.http.get<Paginated<ProjectDocument>>(`${this.base}/`, {
      params: toHttpParams(filters),
    });
  }
  get(id: number): Observable<ProjectDocument> {
    return this.http.get<ProjectDocument>(`${this.base}/${id}/`);
  }
  create(data: Partial<ProjectDocument>): Observable<ProjectDocument> {
    return this.http.post<ProjectDocument>(`${this.base}/`, data);
  }
  update(id: number, data: Partial<ProjectDocument>): Observable<ProjectDocument> {
    return this.http.put<ProjectDocument>(`${this.base}/${id}/`, data);
  }
  remove(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}/`);
  }
  generate(id: number, payload: GeneratePayload): Observable<DocumentVersion> {
    return this.http.post<DocumentVersion>(`${this.base}/${id}/generate/`, payload);
  }
  duplicateDocument(id: number): Observable<ProjectDocument> {
    return this.http.post<ProjectDocument>(`${this.base}/${id}/duplicate/`, {});
  }
  restoreVersion(id: number, versionId: number, authorInitials: string): Observable<DocumentVersion> {
    return this.http.post<DocumentVersion>(`${this.base}/${id}/restore/`,
      { version: versionId, author_initials: authorInitials });
  }
  duplicateTemplate(id: number): Observable<DocumentTemplate> {
    return this.http.post<DocumentTemplate>(`${this.base}/templates/${id}/duplicate/`, {});
  }

  // Templates
  templates(filters: Record<string, unknown> = {}): Observable<Paginated<DocumentTemplate>> {
    return this.http.get<Paginated<DocumentTemplate>>(`${this.base}/templates/`, {
      params: toHttpParams(filters),
    });
  }
  template(id: number): Observable<DocumentTemplate> {
    return this.http.get<DocumentTemplate>(`${this.base}/templates/${id}/`);
  }
  createTemplate(data: Partial<DocumentTemplate>): Observable<DocumentTemplate> {
    return this.http.post<DocumentTemplate>(`${this.base}/templates/`, data);
  }
  updateTemplate(id: number, data: Partial<DocumentTemplate>): Observable<DocumentTemplate> {
    return this.http.put<DocumentTemplate>(`${this.base}/templates/${id}/`, data);
  }
  removeTemplate(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/templates/${id}/`);
  }

  // Choix (confidentialité, types)
  choices(): Observable<Choices> {
    return this.http.get<Choices>(`${this.base}/choices/`);
  }

  // Upload d'image pour un modèle (glisser-déposer)
  uploadAsset(file: File): Observable<{ id: number; url: string }> {
    const fd = new FormData();
    fd.append('image', file);
    fd.append('name', file.name);
    return this.http.post<{ id: number; url: string }>(`${this.base}/assets/`, fd);
  }
}
