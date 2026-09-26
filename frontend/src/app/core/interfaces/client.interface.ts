/** Forme brute (API) d'un client. */
export interface ClientInterface {
  id?: number;
  name: string;
  logo?: string | null;
  logo_url?: string | null;
  contact_name?: string;
  email?: string;
  phone?: string;
  address?: string;
  notes?: string;
  project_count?: number;
  created_at?: string;
  updated_at?: string;
}
