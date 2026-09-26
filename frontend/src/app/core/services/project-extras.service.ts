import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiConfig } from './api.service';
import { JournalEntry, Meeting, Paginated, ProjectLink } from '../models';
import { JournalEntryInterface, MeetingInterface, ProjectLinkInterface } from '../interfaces';
import {
  JournalEntrySerializer, MeetingSerializer, ProjectLinkSerializer, serializePaginated,
} from '../serializers';

@Injectable({ providedIn: 'root' })
export class ProjectExtrasService {
  private http = inject(HttpClient);
  private base = `${inject(ApiConfig).base}/projects`;

  meetings(pid: number): Observable<Paginated<Meeting>> {
    return this.http.get<Paginated<MeetingInterface>>(`${this.base}/meetings/?project=${pid}`)
      .pipe(map((p) => serializePaginated(p, MeetingSerializer.fromApi)));
  }
  addMeeting(m: Partial<Meeting>) {
    return this.http.post<MeetingInterface>(`${this.base}/meetings/`, MeetingSerializer.toApi(m)).pipe(map(MeetingSerializer.fromApi));
  }
  updateMeeting(id: number, patch: Partial<Meeting>) {
    return this.http.patch<MeetingInterface>(`${this.base}/meetings/${id}/`, MeetingSerializer.toApi(patch)).pipe(map(MeetingSerializer.fromApi));
  }
  removeMeeting(id: number) { return this.http.delete<void>(`${this.base}/meetings/${id}/`); }

  journal(pid: number): Observable<Paginated<JournalEntry>> {
    return this.http.get<Paginated<JournalEntryInterface>>(`${this.base}/journal/?project=${pid}`)
      .pipe(map((p) => serializePaginated(p, JournalEntrySerializer.fromApi)));
  }
  addJournal(j: Partial<JournalEntry>) {
    return this.http.post<JournalEntryInterface>(`${this.base}/journal/`, JournalEntrySerializer.toApi(j)).pipe(map(JournalEntrySerializer.fromApi));
  }
  removeJournal(id: number) { return this.http.delete<void>(`${this.base}/journal/${id}/`); }

  links(pid: number): Observable<Paginated<ProjectLink>> {
    return this.http.get<Paginated<ProjectLinkInterface>>(`${this.base}/links/?project=${pid}`)
      .pipe(map((p) => serializePaginated(p, ProjectLinkSerializer.fromApi)));
  }
  addLink(l: Partial<ProjectLink>) {
    return this.http.post<ProjectLinkInterface>(`${this.base}/links/`, ProjectLinkSerializer.toApi(l)).pipe(map(ProjectLinkSerializer.fromApi));
  }
  removeLink(id: number) { return this.http.delete<void>(`${this.base}/links/${id}/`); }
}
