import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ApiConfig {
  readonly base = environment.apiUrl;
}

/** Petit service de notifications (toast). */
@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly message = signal<{ text: string; kind: 'success' | 'error' | 'info' } | null>(
    null,
  );

  show(text: string, kind: 'success' | 'error' | 'info' = 'info') {
    this.message.set({ text, kind });
    setTimeout(() => this.message.set(null), 3500);
  }

  success(text: string) {
    this.show(text, 'success');
  }
  error(text: string) {
    this.show(text, 'error');
  }
}

export function toHttpParams(obj: Record<string, unknown>): HttpParams {
  let params = new HttpParams();
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== '') {
      params = params.set(k, String(v));
    }
  }
  return params;
}
