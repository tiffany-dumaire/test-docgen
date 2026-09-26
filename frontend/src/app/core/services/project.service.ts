import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiConfig, toHttpParams } from './api.service';
import { Paginated, Project } from '../models';
import { ProjectInterface } from '../interfaces';
import { ProjectSerializer, serializePaginated } from '../serializers';

@Injectable({ providedIn: 'root' })
export class ProjectService {
  private http = inject(HttpClient);
  private cfg = inject(ApiConfig);
  private url = `${this.cfg.base}/projects/`;

  list(filters: Record<string, unknown> = {}): Observable<Paginated<Project>> {
    return this.http.get<Paginated<ProjectInterface>>(this.url, {
      params: toHttpParams(filters),
    }).pipe(map((p) => serializePaginated(p, ProjectSerializer.fromApi)));
  }

  get(id: number): Observable<Project> {
    return this.http.get<ProjectInterface>(`${this.url}${id}/`).pipe(map(ProjectSerializer.fromApi));
  }

  create(data: Partial<Project>): Observable<Project> {
    return this.http.post<ProjectInterface>(this.url, ProjectSerializer.toApi(data)).pipe(map(ProjectSerializer.fromApi));
  }

  update(id: number, data: Partial<Project>): Observable<Project> {
    return this.http.put<ProjectInterface>(`${this.url}${id}/`, ProjectSerializer.toApi(data)).pipe(map(ProjectSerializer.fromApi));
  }
  patch(id: number, data: Partial<Project>): Observable<Project> {
    return this.http.patch<ProjectInterface>(`${this.url}${id}/`, ProjectSerializer.toApi(data)).pipe(map(ProjectSerializer.fromApi));
  }
  uploadLogo(id: number, file: File): Observable<Project> {
    const fd = new FormData(); fd.append('logo', file);
    return this.http.patch<ProjectInterface>(`${this.url}${id}/`, fd).pipe(map(ProjectSerializer.fromApi));
  }
  trackingDiagramUrl(id: number, type: string, primary?: string): string {
    let u = `${this.url}${id}/tracking_diagram/?type=${encodeURIComponent(type)}`;
    if (primary) u += `&primary=${encodeURIComponent(primary)}`;
    return u;
  }

  remove(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}${id}/`);
  }
}
