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

  private timer: ReturnType<typeof setTimeout> | null = null;

  show(text: string, kind: 'success' | 'error' | 'info' = 'info') {
    if (this.timer) clearTimeout(this.timer);
    this.message.set({ text, kind });
    // Les erreurs restent un peu plus longtemps pour être lues.
    this.timer = setTimeout(() => this.message.set(null), kind === 'error' ? 5500 : 3500);
  }

  dismiss() {
    if (this.timer) clearTimeout(this.timer);
    this.message.set(null);
  }

  success(text: string) {
    this.show(text, 'success');
  }
  error(text: string) {
    this.show(text, 'error');
  }
  info(text: string) {
    this.show(text, 'info');
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
