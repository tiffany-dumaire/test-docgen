import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiConfig, toHttpParams } from './api.service';
import { Paginated, Project } from '../models';

@Injectable({ providedIn: 'root' })
export class ProjectService {
  private http = inject(HttpClient);
  private cfg = inject(ApiConfig);
  private url = `${this.cfg.base}/projects/`;

  list(filters: Record<string, unknown> = {}): Observable<Paginated<Project>> {
    return this.http.get<Paginated<Project>>(this.url, {
      params: toHttpParams(filters),
    });
  }

  get(id: number): Observable<Project> {
    return this.http.get<Project>(`${this.url}${id}/`);
  }

  create(data: Partial<Project>): Observable<Project> {
    return this.http.post<Project>(this.url, data);
  }

  update(id: number, data: Partial<Project>): Observable<Project> {
    return this.http.put<Project>(`${this.url}${id}/`, data);
  }
  patch(id: number, data: Partial<Project>): Observable<Project> {
    return this.http.patch<Project>(`${this.url}${id}/`, data);
  }
  trackingDiagramUrl(id: number, type: string): string {
    return `${this.url}${id}/tracking_diagram/?type=${encodeURIComponent(type)}`;
  }

  remove(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}${id}/`);
  }
}
