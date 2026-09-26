import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiConfig, toHttpParams } from './api.service';
import {
  Choices,
  DocumentTemplate,
  DocumentVersion,
  GeneratePayload,
  Paginated,
  ProjectDocument,
} from '../models';
import { ProjectDocumentInterface, DocumentVersionInterface } from '../interfaces';
import {
  ProjectDocumentSerializer, DocumentVersionSerializer, serializePaginated,
} from '../serializers';

/** Résultat d'aperçu inline : contenu en base64 (aucune requête média externe). */
export interface PreviewResult {
  kind: 'html' | 'image' | 'pdf' | 'native';
  mime: string;
  b64: string;
}

@Injectable({ providedIn: 'root' })
export class DocumentService {
  private http = inject(HttpClient);
  private cfg = inject(ApiConfig);
  private base = `${this.cfg.base}/documents`;

  // Documents
  list(filters: Record<string, unknown> = {}): Observable<Paginated<ProjectDocument>> {
    return this.http.get<Paginated<ProjectDocumentInterface>>(`${this.base}/`, {
      params: toHttpParams(filters),
    }).pipe(map((p) => serializePaginated(p, ProjectDocumentSerializer.fromApi)));
  }
  get(id: number): Observable<ProjectDocument> {
    return this.http.get<ProjectDocumentInterface>(`${this.base}/${id}/`).pipe(map(ProjectDocumentSerializer.fromApi));
  }
  create(data: Partial<ProjectDocument>): Observable<ProjectDocument> {
    return this.http.post<ProjectDocumentInterface>(`${this.base}/`, ProjectDocumentSerializer.toApi(data)).pipe(map(ProjectDocumentSerializer.fromApi));
  }
  update(id: number, data: Partial<ProjectDocument>): Observable<ProjectDocument> {
    return this.http.put<ProjectDocumentInterface>(`${this.base}/${id}/`, ProjectDocumentSerializer.toApi(data)).pipe(map(ProjectDocumentSerializer.fromApi));
  }
  remove(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}/`);
  }
  generate(id: number, payload: GeneratePayload): Observable<DocumentVersion> {
    return this.http.post<DocumentVersionInterface>(`${this.base}/${id}/generate/`, payload).pipe(map(DocumentVersionSerializer.fromApi));
  }
  duplicateDocument(id: number): Observable<ProjectDocument> {
    return this.http.post<ProjectDocumentInterface>(`${this.base}/${id}/duplicate/`, {}).pipe(map(ProjectDocumentSerializer.fromApi));
  }
  preview(id: number): Observable<PreviewResult> {
    return this.http.get<PreviewResult>(`${this.base}/${id}/preview/`);
  }
  previewTemplate(id: number): Observable<PreviewResult> {
    return this.http.get<PreviewResult>(`${this.base}/templates/${id}/preview/`);
  }
  exportA3(id: number, fmt: 'pdf' | 'png' | 'svg', lang?: string): Observable<Blob> {
    const l = lang ? `&lang=${encodeURIComponent(lang)}` : '';
    return this.http.get(`${this.base}/templates/${id}/export_a3/?fmt=${fmt}&download=1${l}`,
      { responseType: 'blob' });
  }
  restoreVersion(id: number, versionId: number, authorInitials: string): Observable<DocumentVersion> {
    return this.http.post<DocumentVersionInterface>(`${this.base}/${id}/restore/`,
      { version: versionId, author_initials: authorInitials }).pipe(map(DocumentVersionSerializer.fromApi));
  }
  duplicateTemplate(id: number): Observable<DocumentTemplate> {
    return this.http.post<DocumentTemplate>(`${this.base}/templates/${id}/duplicate/`, {});
  }

  // Templates (schéma de mise en page : conservés en interface brute)
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
