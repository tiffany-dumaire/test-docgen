import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiConfig } from './api.service';
import { JournalEntry, Meeting, Paginated, ProjectLink } from '../models';

@Injectable({ providedIn: 'root' })
export class ProjectExtrasService {
  private http = inject(HttpClient);
  private base = `${inject(ApiConfig).base}/projects`;

  meetings(pid: number): Observable<Paginated<Meeting>> {
    return this.http.get<Paginated<Meeting>>(`${this.base}/meetings/?project=${pid}`);
  }
  addMeeting(m: Meeting) { return this.http.post<Meeting>(`${this.base}/meetings/`, m); }
  updateMeeting(id: number, patch: Partial<Meeting>) { return this.http.patch<Meeting>(`${this.base}/meetings/${id}/`, patch); }
  removeMeeting(id: number) { return this.http.delete<void>(`${this.base}/meetings/${id}/`); }

  journal(pid: number): Observable<Paginated<JournalEntry>> {
    return this.http.get<Paginated<JournalEntry>>(`${this.base}/journal/?project=${pid}`);
  }
  addJournal(j: JournalEntry) { return this.http.post<JournalEntry>(`${this.base}/journal/`, j); }
  removeJournal(id: number) { return this.http.delete<void>(`${this.base}/journal/${id}/`); }

  links(pid: number): Observable<Paginated<ProjectLink>> {
    return this.http.get<Paginated<ProjectLink>>(`${this.base}/links/?project=${pid}`);
  }
  addLink(l: ProjectLink) { return this.http.post<ProjectLink>(`${this.base}/links/`, l); }
  removeLink(id: number) { return this.http.delete<void>(`${this.base}/links/${id}/`); }
}
