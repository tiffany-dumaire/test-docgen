export interface UsefulLink {
  id?: number;
  label: string;
  url: string;
  order?: number;
}

export interface CompanyProfile {
  styles?: StyleMap;
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


export interface Client {
  id?: number;
  name: string;
  contact_name?: string;
  email?: string;
  phone?: string;
  address?: string;
  notes?: string;
  project_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface TeamMember {
  id?: number;
  team?: number;
  first_name: string;
  last_name: string;
  full_name?: string;
  role?: string;
  email?: string;
  phone?: string;
}

export interface Team {
  id?: number;
  name: string;
  description?: string;
  members: TeamMember[];
  member_count?: number;
  created_at?: string;
}

export interface ProjectAssignment {
  id?: number;
  member: number;
  member_name?: string;
  member_email?: string;
  team_name?: string;
  role?: string;
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
  start_date?: string | null;
  end_date?: string | null;
  client?: number | null;
  client_detail?: Client | null;
  styles?: StyleMap;
  contacts: Contact[];
  assignments?: ProjectAssignment[];
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
  | 'diagram'
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
  // diagram (SmartArt)
  variant?: string;
  diagram_items?: { title: string; text?: string }[];
}

export interface LayoutElement {
  id: string;
  type: 'text' | 'image' | 'logo' | 'rect' | 'line';
  x: number; y: number; w: number; h: number;
  [k: string]: unknown;
}
export interface PageLayout {
  background?: string;
  elements: LayoutElement[];
}

export interface ElementStyle {
  font?: string; size?: number; bold?: boolean; italic?: boolean;
  color?: string; align?: 'left' | 'center' | 'right' | 'justify';
  space_after?: number;
}
export type StyleMap = { [element: string]: ElementStyle };

export interface TemplateSettings {
  cover_title?: string;
  cover_subtitle?: string;
  include_cover?: boolean;
  include_suivi?: boolean;
  include_toc?: boolean;
  table_color?: string;
  excel?: ExcelWorkbook;
  layouts?: { [page: string]: PageLayout };
  styles?: StyleMap;
}

// ---- Classeurs Excel personnalisables ----
export type CellType =
  | 'text'
  | 'integer'
  | 'decimal'
  | 'currency'
  | 'percent'
  | 'date';

export type SheetType = 'table' | 'pivot' | 'info';

export interface ExcelColumn {
  key: string;
  label: string;
  type: CellType;
  symbol?: string;
  decimals?: number;
  formula?: string;
}

export interface ConditionalFormat {
  column: string;
  kind?: 'cellis' | 'color_scale' | 'data_bar';
  op?: string;
  value?: number | string;
  value2?: number | string;
  fill?: string;
  font?: string;
}

export interface CellValidation {
  column: string;
  kind: 'list' | 'whole' | 'decimal' | 'date';
  options?: string[];
  op?: string;
  value?: number | string;
  value2?: number | string;
}

export interface CellFormula {
  cell: string;
  formula: string;
}

export interface ColumnGroup {
  label: string;
  span: number;
}

export interface ExcelInfoItem {
  label: string;
  type: CellType;
  value: string | number;
  symbol?: string;
  decimals?: number;
}

export interface PivotConfig {
  source: string;
  row_field: string;
  col_field?: string;
  value_field: string;
  agg: 'sum' | 'count' | 'avg' | 'min' | 'max';
  value_type: CellType;
  symbol?: string;
  decimals?: number;
}

export interface ExcelSheet {
  id: string;
  name: string;
  title?: string;
  type: SheetType;
  // table
  groups?: ColumnGroup[];
  columns?: ExcelColumn[];
  show_totals?: boolean;
  allow_add_rows?: boolean;
  allow_add_columns?: boolean;
  // pivot
  pivot?: PivotConfig;
  // info
  items?: ExcelInfoItem[];
  // règles (table)
  conditional_formats?: ConditionalFormat[];
  validations?: CellValidation[];
  cell_formulas?: CellFormula[];
}

export interface ExcelWorkbook {
  sheets: ExcelSheet[];
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
  scope?: 'global' | 'projects';
  projects?: number[];
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
  doc_date?: string | null;
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
  deadline?: string | null;
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


// ---- Authentification ----
export interface AuthUser {
  id: number;
  sub: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  app_roles: string[];
  primary_app_role: string;
  ui_prefs?: { accent?: string; [k: string]: unknown };
  memberships?: { id: number; project: number; roles: string[] }[];
}
export interface AuthConfig {
  mode: 'dev' | 'oidc';
  authority: string;
  client_id: string;
  authorize_url: string;
  token_url: string;
  end_session_url: string;
  scopes: string;
  redirect_uri: string;
  post_logout_redirect_uri: string;
}
