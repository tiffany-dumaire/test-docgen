import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiConfig } from './api.service';
import { AuthUser, Paginated } from '../models';

export interface Membership {
  id?: number; user: number; user_name?: string; user_email?: string;
  project: number; roles: string[];
}

@Injectable({ providedIn: 'root' })
export class MembershipService {
  private http = inject(HttpClient);
  private base = `${inject(ApiConfig).base}/auth`;

  list(projectId: number): Observable<Paginated<Membership>> {
    return this.http.get<Paginated<Membership>>(`${this.base}/memberships/?project=${projectId}`);
  }
  create(m: Membership): Observable<Membership> {
    return this.http.post<Membership>(`${this.base}/memberships/`, m);
  }
  update(id: number, m: Partial<Membership>): Observable<Membership> {
    return this.http.put<Membership>(`${this.base}/memberships/${id}/`, m);
  }
  remove(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/memberships/${id}/`);
  }
  users(): Observable<Paginated<AuthUser>> {
    return this.http.get<Paginated<AuthUser>>(`${this.base}/users/`);
  }
}
