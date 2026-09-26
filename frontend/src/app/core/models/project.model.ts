import { ProjectStatus } from '../enums/project-status.enum';
import { Client } from './client.model';
import { Contact } from './contact.model';
import {
  ProjectInstance, ProjectRepo, ProjectChildRef, CustomFieldDef,
} from '../interfaces/project.interface';
import { ProjectTracking } from '../interfaces/tracking.interface';
import { StyleMap } from '../interfaces/style.interface';
import { ProjectLink } from './extras.model';

/** Affectation d'un membre d'équipe à un projet. */
export class ProjectAssignment {
  id?: number;
  member!: number;
  memberName?: string;
  memberEmail?: string;
  teamName?: string;
  role?: string;
}

/** Projet (modèle applicatif, attributs camelCase). */
export class Project {
  id?: number;
  name = '';
  clientName = '';
  clientLogo?: string | null;
  clientLogoUrl?: string | null;
  logo?: string | null;
  logoUrl?: string | null;
  instances?: ProjectInstance[];
  repos?: ProjectRepo[];
  description = '';
  reference = '';
  status: ProjectStatus = ProjectStatus.Active;
  startDate?: string | null;
  endDate?: string | null;
  client?: number | null;
  clientDetail?: Client | null;
  clients?: number[];
  clientsDetail?: Client[];
  parent?: number | null;
  children?: ProjectChildRef[];
  customFieldDefs?: CustomFieldDef[];
  /** Blob de valeurs (clés dynamiques), transmis tel quel. */
  customFields?: Record<string, unknown>;
  /** Blob de suivi de projet, transmis tel quel. */
  tracking?: ProjectTracking;
  links?: ProjectLink[];
  /** Blob de styles (clés dynamiques par élément), transmis tel quel. */
  styles?: StyleMap;
  contacts: Contact[] = [];
  assignments?: ProjectAssignment[];
  documentCount?: number;
  createdAt?: string;
  updatedAt?: string;
}
