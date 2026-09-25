import { HttpInterceptorFn } from '@angular/common/http';

const TOKEN_KEY = 'docugen_token';

/** Ajoute le jeton Bearer aux appels API (sauf endpoints publics d'auth). */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  let token: string | null = null;
  try { token = localStorage.getItem(TOKEN_KEY); } catch { token = null; }
  const isTokenExchange = req.url.includes('/auth/dev-token') || req.url.includes('/auth/config')
    || req.url.includes('/auth/login') || req.url.includes('/auth/callback');
  if (token && !isTokenExchange) {
    req = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
  }
  return next(req);
};
