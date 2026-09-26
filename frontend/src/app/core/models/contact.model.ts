import { ContactKind } from '../enums/contact-kind.enum';

/** Contact rattaché à un projet (modèle applicatif, attributs camelCase). */
export class Contact {
  id?: number;
  kind: ContactKind = ContactKind.Client;
  firstName = '';
  lastName = '';
  fullName?: string;
  initials?: string;
  role = '';
  email = '';
  phone = '';
}
