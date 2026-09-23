import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiConfig } from './api.service';
import { CompanyProfile, Paginated, Team, TeamMember } from '../models';

@Injectable({ providedIn: 'root' })
export class CompanyService {
  private http = inject(HttpClient);
  private cfg = inject(ApiConfig);
  private url = `${this.cfg.base}/company/`;

  get(): Observable<CompanyProfile> {
    return this.http.get<CompanyProfile>(this.url);
  }

  update(data: Partial<CompanyProfile>): Observable<CompanyProfile> {
    return this.http.put<CompanyProfile>(this.url, data);
  }

  /** Mise à jour avec upload de logo (multipart). */
  updateWithLogo(data: FormData): Observable<CompanyProfile> {
    return this.http.patch<CompanyProfile>(this.url, data);
  }
}


@Injectable({ providedIn: 'root' })
export class TeamService {
  private http = inject(HttpClient);
  private cfg = inject(ApiConfig);
  private base = `${this.cfg.base}/company`;

  teams(): Observable<Paginated<Team>> {
    return this.http.get<Paginated<Team>>(`${this.base}/teams/`);
  }
  createTeam(data: Partial<Team>): Observable<Team> {
    return this.http.post<Team>(`${this.base}/teams/`, data);
  }
  updateTeam(id: number, data: Partial<Team>): Observable<Team> {
    return this.http.put<Team>(`${this.base}/teams/${id}/`, data);
  }
  removeTeam(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/teams/${id}/`);
  }
  addMember(data: Partial<TeamMember>): Observable<TeamMember> {
    return this.http.post<TeamMember>(`${this.base}/members/`, data);
  }
  removeMember(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/members/${id}/`);
  }
}
