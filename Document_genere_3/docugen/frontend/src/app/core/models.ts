export interface UsefulLink {
  id?: number;
  label: string;
  url: string;
  order?: number;
}

export interface CompanyProfile {
  id?: number;
  name: string;
  logo?: string | null;
  logo_url?: string | null;
  description: string;
  website_url: string;
  terms_url: string;
  address: string;
  phone: string;
  email: string;
  useful_links: UsefulLink[];
  updated_at?: string;
}

export type ContactKind = 'client' | 'internal';

export interface Contact {
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

export interface Project {
  id?: number;
  name: string;
  client_name: string;
  client_logo?: string | null;
  client_logo_url?: string | null;
  description: string;
  reference: string;
  status: 'active' | 'on_hold' | 'archived';
  contacts: Contact[];
  document_count?: number;
  created_at?: string;
  updated_at?: string;
}

export type DocType = 'pdf' | 'xlsx' | 'docx';

export type BlockType =
  | 'heading'
  | 'text'
  | 'richtext'
  | 'bullet_list'
  | 'numbered_list'
  | 'image'
  | 'logo'
  | 'table'
  | 'field'
  | 'code'
  | 'link'
  | 'contacts'
  | 'spacer';

export type FieldType = 'text' | 'textarea' | 'number' | 'date' | 'select';

export interface TableColumn {
  label: string;
}

export interface Block {
  id: string;
  type: BlockType;
  // heading / text / richtext / code
  text?: string;
  level?: number;
  // field
  key?: string;
  label?: string;
  field_type?: FieldType;
  required?: boolean;
  options?: string[];
  show_label?: boolean;
  // table
  columns?: TableColumn[];
  allow_edit_columns?: boolean;
  // contacts
  scope?: 'client' | 'internal' | 'both';
  // lists
  items?: string[];
  // image / logo
  asset_url?: string;
  width_pct?: number;
  align?: 'left' | 'center' | 'right';
  // link
  url?: string;
}

export interface TemplateSettings {
  cover_title?: string;
  cover_subtitle?: string;
  include_cover?: boolean;
  include_suivi?: boolean;
  include_toc?: boolean;
}

/** Données d'un bloc tableau, façon tableur. */
export interface TableData {
  columns: string[];
  rows: string[][];
}

export interface SchemaField {
  key: string;
  label: string;
  type: string;
  required?: boolean;
  help?: string;
  options?: string[];
}

export interface DocumentTemplate {
  id?: number;
  name: string;
  slug: string;
  description: string;
  doc_type: DocType;
  doc_type_display?: string;
  builder_key: string;
  is_block_based?: boolean;
  schema: Block[] | SchemaField[];
  settings?: TemplateSettings;
  is_active: boolean;
  is_system?: boolean;
}

export type Confidentiality =
  | 'public'
  | 'internal'
  | 'confidential'
  | 'restricted';

export interface DocumentVersion {
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

export interface ProjectDocument {
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
  current_version?: number;
  versions?: DocumentVersion[];
  created_at?: string;
  updated_at?: string;
}

export interface GeneratePayload {
  author_initials: string;
  author_name?: string;
  comment?: string;
  confidentiality?: Confidentiality;
  data?: Record<string, unknown>;
}

export interface ShortLink {
  id: number;
  code: string;
  target_url: string;
  click_count: number;
  short_url: string;
}

export interface FormField {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'email' | 'number' | 'date' | 'select' | 'checkbox';
  required?: boolean;
  options?: string[];
}

export interface OnlineForm {
  id?: number;
  title: string;
  description: string;
  project?: number | null;
  schema: FormField[];
  confidentiality: Confidentiality;
  confidentiality_display?: string;
  is_open: boolean;
  success_message: string;
  short_link?: ShortLink | null;
  short_url?: string | null;
  submission_count?: number;
}

export interface FormSubmission {
  id: number;
  form: number;
  data: Record<string, unknown>;
  submitted_at: string;
}

export interface Choice {
  value: string;
  label: string;
}

export interface Choices {
  confidentiality_levels: Choice[];
  document_types: Choice[];
}

export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}
