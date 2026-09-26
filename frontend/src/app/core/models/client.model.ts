/** Client (modèle applicatif, attributs camelCase). */
export class Client {
  id?: number;
  name = '';
  logo?: string | null;
  logoUrl?: string | null;
  contactName?: string;
  email?: string;
  phone?: string;
  address?: string;
  notes?: string;
  projectCount?: number;
  createdAt?: string;
  updatedAt?: string;
}
