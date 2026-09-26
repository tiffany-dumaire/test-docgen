import { Contact } from '../models/contact.model';
import { ContactInterface } from '../interfaces/contact.interface';
import { pruneUndefined } from './serializer.util';

export class ContactSerializer {
  static fromApi(dto: ContactInterface): Contact {
    const m = new Contact();
    m.id = dto.id;
    m.kind = dto.kind;
    m.firstName = dto.first_name;
    m.lastName = dto.last_name;
    m.fullName = dto.full_name;
    m.initials = dto.initials;
    m.role = dto.role;
    m.email = dto.email;
    m.phone = dto.phone;
    return m;
  }

  static toApi(m: Partial<Contact>): Partial<ContactInterface> {
    return pruneUndefined({
      id: m.id,
      kind: m.kind,
      first_name: m.firstName,
      last_name: m.lastName,
      role: m.role,
      email: m.email,
      phone: m.phone,
    });
  }
}
