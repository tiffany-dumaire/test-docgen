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

  // ---- Équipes ----
  teams(): Observable<Paginated<Team>> {
    return this.http.get<Paginated<Team>>(`${this.base}/teams/`);
  }
  team(id: number): Observable<Team> {
    return this.http.get<Team>(`${this.base}/teams/${id}/`);
  }
  createTeam(data: Partial<Team>): Observable<Team> {
    return this.http.post<Team>(`${this.base}/teams/`, data);
  }
  updateTeam(id: number, data: Partial<Team>): Observable<Team> {
    return this.http.patch<Team>(`${this.base}/teams/${id}/`, data);
  }
  removeTeam(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/teams/${id}/`);
  }

  // ---- Collaborateurs ----
  members(filters: Record<string, unknown> = {}): Observable<Paginated<TeamMember>> {
    const qs = new URLSearchParams(filters as Record<string, string>).toString();
    return this.http.get<Paginated<TeamMember>>(`${this.base}/members/${qs ? '?' + qs : ''}`);
  }
  addMember(data: Partial<TeamMember>): Observable<TeamMember> {
    return this.http.post<TeamMember>(`${this.base}/members/`, data);
  }
  updateMember(id: number, data: Partial<TeamMember>): Observable<TeamMember> {
    return this.http.patch<TeamMember>(`${this.base}/members/${id}/`, data);
  }
  removeMember(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/members/${id}/`);
  }
}
