import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiConfig } from './api.service';
import { CompanyProfile } from '../models';

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
