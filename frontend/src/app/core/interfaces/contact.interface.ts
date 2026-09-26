import { ContactKind } from '../enums/contact-kind.enum';

/** Forme brute (API) d'un contact projet. */
export interface ContactInterface {
  id?: number;
  kind: ContactKind;
  first_name: string;
  last_name: string;
  full_name?: string;
  initials?: string;
  role: string;
  email: string;
  phone: string;
}
