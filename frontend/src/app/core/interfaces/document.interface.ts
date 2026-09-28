import { Confidentiality } from '../enums/confidentiality.enum';
import { DocType } from './document-template.interface';

/** Forme brute (API) d'une version de document. */
export interface DocumentVersionInterface {
  id: number;
  version_number: number;
  comment: string;
  author_initials: string;
  author_name: string;
  confidentiality: Confidentiality;
  confidentiality_display?: string;
  file_url?: string;
  created_at: string;
}

/** Forme brute (API) d'un document projet. */
export interface ProjectDocumentInterface {
  id?: number;
  project: number;
  project_name?: string;
  template: number;
  template_name?: string;
  doc_type?: DocType;
  title: string;
  confidentiality: Confidentiality;
  confidentiality_display?: string;
  data: Record<string, unknown>;
  doc_date?: string | null;
  current_version?: number;
  versions?: DocumentVersionInterface[];
  created_at?: string;
  updated_at?: string;
}

/** Payload de génération d'une nouvelle version (écriture). */
export interface GeneratePayload {
  author_initials: string;
  author_name?: string;
  comment?: string;
  confidentiality?: Confidentiality;
  data?: Record<string, unknown>;
}

/** Forme brute (API) d'un lien court. */
export interface ShortLinkInterface {
  id: number;
  code: string;
  target_url: string;
  click_count: number;
  short_url: string;
}
