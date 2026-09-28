import { Client } from '../models/client.model';
import { ClientInterface } from '../interfaces/client.interface';
import { pruneUndefined } from './serializer.util';

export class ClientSerializer {
  static fromApi(dto: ClientInterface): Client {
    const m = new Client();
    m.id = dto.id;
    m.name = dto.name;
    m.logo = dto.logo;
    m.logoUrl = dto.logo_url;
    m.contactName = dto.contact_name;
    m.email = dto.email;
    m.phone = dto.phone;
    m.address = dto.address;
    m.notes = dto.notes;
    m.projectCount = dto.project_count;
    m.createdAt = dto.created_at;
    m.updatedAt = dto.updated_at;
    return m;
  }

  static toApi(m: Partial<Client>): Partial<ClientInterface> {
    return pruneUndefined({
      id: m.id,
      name: m.name,
      logo: m.logo,
      contact_name: m.contactName,
      email: m.email,
      phone: m.phone,
      address: m.address,
      notes: m.notes,
    });
  }
}
