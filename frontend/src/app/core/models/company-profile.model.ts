import { CompanyStyles, UsefulLink } from '../interfaces/company.interface';
import { StyleMap } from '../interfaces/style.interface';

/** Profil d'entreprise (modèle applicatif, attributs camelCase). */
export class CompanyProfile {
  id?: number;
  name = '';
  logo?: string | null;
  logoUrl?: string | null;
  description = '';
  websiteUrl = '';
  termsUrl = '';
  address = '';
  phone = '';
  email = '';
  usefulLinks: UsefulLink[] = [];
  /** Blob de styles (clés dynamiques par élément), transmis tel quel. */
  styles?: CompanyStyles | StyleMap;
  updatedAt?: string;
}
