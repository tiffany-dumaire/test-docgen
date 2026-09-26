import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiConfig } from './api.service';
import { AuthUser, Paginated, Membership } from '../models';
import { MembershipInterface } from '../interfaces';
import { MembershipSerializer, serializePaginated } from '../serializers';

// Ré-exporté pour compatibilité avec les imports historiques
// `import { Membership } from '.../membership.service'`.
export { Membership } from '../models';

@Injectable({ providedIn: 'root' })
export class MembershipService {
  private http = inject(HttpClient);
  private base = `${inject(ApiConfig).base}/auth`;

  list(projectId: number): Observable<Paginated<Membership>> {
    return this.http.get<Paginated<MembershipInterface>>(`${this.base}/memberships/?project=${projectId}`)
      .pipe(map((p) => serializePaginated(p, MembershipSerializer.fromApi)));
  }
  create(m: Partial<Membership>): Observable<Membership> {
    return this.http.post<MembershipInterface>(`${this.base}/memberships/`, MembershipSerializer.toApi(m))
      .pipe(map(MembershipSerializer.fromApi));
  }
  update(id: number, m: Partial<Membership>): Observable<Membership> {
    return this.http.put<MembershipInterface>(`${this.base}/memberships/${id}/`, MembershipSerializer.toApi(m))
      .pipe(map(MembershipSerializer.fromApi));
  }
  remove(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/memberships/${id}/`);
  }
  users(): Observable<Paginated<AuthUser>> {
    return this.http.get<Paginated<AuthUser>>(`${this.base}/users/`);
  }
}
