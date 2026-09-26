import { Project, ProjectAssignment } from '../models/project.model';
import {
  ProjectInterface, ProjectAssignmentInterface,
} from '../interfaces/project.interface';
import { ClientSerializer } from './client.serializer';
import { ContactSerializer } from './contact.serializer';
import { ProjectLinkSerializer } from './extras.serializer';
import { mapArray, pruneUndefined } from './serializer.util';

export class ProjectAssignmentSerializer {
  static fromApi(dto: ProjectAssignmentInterface): ProjectAssignment {
    const m = new ProjectAssignment();
    m.id = dto.id;
    m.member = dto.member;
    m.memberName = dto.member_name;
    m.memberEmail = dto.member_email;
    m.teamName = dto.team_name;
    m.role = dto.role;
    return m;
  }

  static toApi(m: Partial<ProjectAssignment>): Partial<ProjectAssignmentInterface> {
    return pruneUndefined({
      id: m.id,
      member: m.member,
      role: m.role,
    });
  }
}

export class ProjectSerializer {
  static fromApi(dto: ProjectInterface): Project {
    const m = new Project();
    m.id = dto.id;
    m.name = dto.name;
    m.clientName = dto.client_name;
    m.clientLogo = dto.client_logo;
    m.clientLogoUrl = dto.client_logo_url;
    m.logo = dto.logo;
    m.logoUrl = dto.logo_url;
    m.instances = dto.instances;
    m.repos = dto.repos;
    m.description = dto.description;
    m.reference = dto.reference;
    m.status = dto.status;
    m.startDate = dto.start_date;
    m.endDate = dto.end_date;
    m.client = dto.client;
    m.clientDetail = dto.client_detail ? ClientSerializer.fromApi(dto.client_detail) : dto.client_detail;
    m.clients = dto.clients;
    m.clientsDetail = mapArray(dto.clients_detail, ClientSerializer.fromApi);
    m.parent = dto.parent;
    m.children = dto.children;
    m.customFieldDefs = dto.custom_field_defs;
    m.customFields = dto.custom_fields;
    m.tracking = dto.tracking;
    m.links = mapArray(dto.links, ProjectLinkSerializer.fromApi);
    m.styles = dto.styles;
    m.contacts = (dto.contacts ?? []).map(ContactSerializer.fromApi);
    m.assignments = mapArray(dto.assignments, ProjectAssignmentSerializer.fromApi);
    m.documentCount = dto.document_count;
    m.createdAt = dto.created_at;
    m.updatedAt = dto.updated_at;
    return m;
  }

  static toApi(m: Partial<Project>): Partial<ProjectInterface> {
    return pruneUndefined({
      id: m.id,
      name: m.name,
      client_name: m.clientName,
      logo: m.logo,
      instances: m.instances,
      repos: m.repos,
      description: m.description,
      reference: m.reference,
      status: m.status,
      start_date: m.startDate,
      end_date: m.endDate,
      client: m.client,
      clients: m.clients,
      parent: m.parent,
      custom_field_defs: m.customFieldDefs,
      custom_fields: m.customFields,
      styles: m.styles,
      contacts: m.contacts ? m.contacts.map(ContactSerializer.toApi) as any : undefined,
      assignments: m.assignments ? m.assignments.map(ProjectAssignmentSerializer.toApi) as any : undefined,
    });
  }
}
