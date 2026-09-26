import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiConfig } from './api.service';
import { CompanyProfile, Paginated, Team, TeamMember } from '../models';
import { CompanyProfileInterface, TeamInterface, TeamMemberInterface } from '../interfaces';
import {
  CompanyProfileSerializer, TeamSerializer, TeamMemberSerializer, serializePaginated,
} from '../serializers';

@Injectable({ providedIn: 'root' })
export class CompanyService {
  private http = inject(HttpClient);
  private cfg = inject(ApiConfig);
  private url = `${this.cfg.base}/company/`;

  get(): Observable<CompanyProfile> {
    return this.http.get<CompanyProfileInterface>(this.url).pipe(map(CompanyProfileSerializer.fromApi));
  }

  update(data: Partial<CompanyProfile>): Observable<CompanyProfile> {
    return this.http.put<CompanyProfileInterface>(this.url, CompanyProfileSerializer.toApi(data))
      .pipe(map(CompanyProfileSerializer.fromApi));
  }

  /** Mise à jour avec upload de logo (multipart). */
  updateWithLogo(data: FormData): Observable<CompanyProfile> {
    return this.http.patch<CompanyProfileInterface>(this.url, data).pipe(map(CompanyProfileSerializer.fromApi));
  }
}


@Injectable({ providedIn: 'root' })
export class TeamService {
  private http = inject(HttpClient);
  private cfg = inject(ApiConfig);
  private base = `${this.cfg.base}/company`;

  // ---- Équipes ----
  teams(): Observable<Paginated<Team>> {
    return this.http.get<Paginated<TeamInterface>>(`${this.base}/teams/`)
      .pipe(map((p) => serializePaginated(p, TeamSerializer.fromApi)));
  }
  team(id: number): Observable<Team> {
    return this.http.get<TeamInterface>(`${this.base}/teams/${id}/`).pipe(map(TeamSerializer.fromApi));
  }
  createTeam(data: Partial<Team>): Observable<Team> {
    return this.http.post<TeamInterface>(`${this.base}/teams/`, TeamSerializer.toApi(data)).pipe(map(TeamSerializer.fromApi));
  }
  updateTeam(id: number, data: Partial<Team>): Observable<Team> {
    return this.http.patch<TeamInterface>(`${this.base}/teams/${id}/`, TeamSerializer.toApi(data)).pipe(map(TeamSerializer.fromApi));
  }
  removeTeam(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/teams/${id}/`);
  }

  // ---- Collaborateurs ----
  members(filters: Record<string, unknown> = {}): Observable<Paginated<TeamMember>> {
    const qs = new URLSearchParams(filters as Record<string, string>).toString();
    return this.http.get<Paginated<TeamMemberInterface>>(`${this.base}/members/${qs ? '?' + qs : ''}`)
      .pipe(map((p) => serializePaginated(p, TeamMemberSerializer.fromApi)));
  }
  addMember(data: Partial<TeamMember>): Observable<TeamMember> {
    return this.http.post<TeamMemberInterface>(`${this.base}/members/`, TeamMemberSerializer.toApi(data)).pipe(map(TeamMemberSerializer.fromApi));
  }
  updateMember(id: number, data: Partial<TeamMember>): Observable<TeamMember> {
    return this.http.patch<TeamMemberInterface>(`${this.base}/members/${id}/`, TeamMemberSerializer.toApi(data)).pipe(map(TeamMemberSerializer.fromApi));
  }
  removeMember(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/members/${id}/`);
  }
}
