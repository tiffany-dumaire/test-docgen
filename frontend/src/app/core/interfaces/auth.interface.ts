// ---- Authentification ----
export interface AuthUser {
  id: number;
  sub: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  app_roles: string[];
  primary_app_role: string;
  ui_prefs?: { accent?: string; [k: string]: unknown };
  memberships?: { id: number; project: number; roles: string[] }[];
}

export interface AuthConfig {
  mode: 'dev' | 'oidc';
  authority: string;
  client_id: string;
  authorize_url: string;
  token_url: string;
  end_session_url: string;
  scopes: string;
  redirect_uri: string;
  post_logout_redirect_uri: string;
}
