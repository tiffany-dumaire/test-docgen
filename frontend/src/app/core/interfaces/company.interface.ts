import { StyleMap } from './style.interface';

export interface UsefulLink {
  id?: number;
  category?: string;
  label: string;
  url: string;
  order?: number;
}

export interface CompanyStyles {
  global?: StyleMap;
  types?: { [docType: string]: StyleMap };
}

/** Forme brute (API) du profil d'entreprise. */
export interface CompanyProfileInterface {
  styles?: CompanyStyles | StyleMap;
  id?: number;
  name: string;
  logo?: string | null;
  logo_url?: string | null;
  description: string;
  website_url: string;
  terms_url: string;
  address: string;
  phone: string;
  email: string;
  useful_links: UsefulLink[];
  updated_at?: string;
}
