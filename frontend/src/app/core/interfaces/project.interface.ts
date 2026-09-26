import { ProjectStatus } from '../enums/project-status.enum';
import { ClientInterface } from './client.interface';
import { ContactInterface } from './contact.interface';
import { ProjectTracking } from './tracking.interface';
import { StyleMap } from './style.interface';
import { ProjectLinkInterface } from './extras.interface';

export interface ProjectAssignmentInterface {
  id?: number;
  member: number;
  member_name?: string;
  member_email?: string;
  team_name?: string;
  role?: string;
}

export interface ProjectInstance {
  name: string;
  ip?: string;
  domain?: string;
  url?: string;
}

export interface ProjectRepo {
  id: string;
  parent?: string | null;   // id du dépôt parent (arborescence)
  name: string;
  url?: string;
  component?: string;        // composante du projet
  instance?: string;         // nom de l'instance associée
}

export interface ProjectChildRef {
  id: number;
  name: string;
  status: string;
}

export interface CustomFieldDef {
  key: string;
  label: string;
  type: string;
  options?: string[];
}

/** Forme brute (API) d'un projet. */
export interface ProjectInterface {
  id?: number;
  name: string;
  client_name: string;
  client_logo?: string | null;
  client_logo_url?: string | null;
  logo?: string | null;
  logo_url?: string | null;
  instances?: ProjectInstance[];
  repos?: ProjectRepo[];
  description: string;
  reference: string;
  status: ProjectStatus;
  start_date?: string | null;
  end_date?: string | null;
  client?: number | null;
  client_detail?: ClientInterface | null;
  clients?: number[];
  clients_detail?: ClientInterface[];
  parent?: number | null;
  children?: ProjectChildRef[];
  custom_field_defs?: CustomFieldDef[];
  custom_fields?: Record<string, unknown>;
  tracking?: ProjectTracking;
  links?: ProjectLinkInterface[];
  styles?: StyleMap;
  contacts: ContactInterface[];
  assignments?: ProjectAssignmentInterface[];
  document_count?: number;
  created_at?: string;
  updated_at?: string;
}
