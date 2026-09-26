import { Membership } from '../models/membership.model';
import { MembershipInterface } from '../interfaces/membership.interface';
import { pruneUndefined } from './serializer.util';

export class MembershipSerializer {
  static fromApi(dto: MembershipInterface): Membership {
    const m = new Membership();
    m.id = dto.id;
    m.user = dto.user;
    m.userName = dto.user_name;
    m.userEmail = dto.user_email;
    m.project = dto.project;
    m.roles = dto.roles ?? [];
    return m;
  }

  static toApi(m: Partial<Membership>): Partial<MembershipInterface> {
    return pruneUndefined({
      id: m.id,
      user: m.user,
      project: m.project,
      roles: m.roles,
    });
  }
}
