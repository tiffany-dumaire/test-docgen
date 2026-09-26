import { CompanyProfile } from '../models/company-profile.model';
import { CompanyProfileInterface } from '../interfaces/company.interface';
import { pruneUndefined } from './serializer.util';

export class CompanyProfileSerializer {
  static fromApi(dto: CompanyProfileInterface): CompanyProfile {
    const m = new CompanyProfile();
    m.id = dto.id;
    m.name = dto.name;
    m.logo = dto.logo;
    m.logoUrl = dto.logo_url;
    m.description = dto.description;
    m.websiteUrl = dto.website_url;
    m.termsUrl = dto.terms_url;
    m.address = dto.address;
    m.phone = dto.phone;
    m.email = dto.email;
    m.usefulLinks = dto.useful_links ?? [];
    m.styles = dto.styles;
    m.updatedAt = dto.updated_at;
    return m;
  }

  static toApi(m: Partial<CompanyProfile>): Partial<CompanyProfileInterface> {
    return pruneUndefined({
      id: m.id,
      name: m.name,
      logo: m.logo,
      description: m.description,
      website_url: m.websiteUrl,
      terms_url: m.termsUrl,
      address: m.address,
      phone: m.phone,
      email: m.email,
      useful_links: m.usefulLinks,
      styles: m.styles,
    });
  }
}
