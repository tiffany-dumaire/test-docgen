export interface UsefulLink {
  id?: number;
  category?: string;
  label: string;
  url: string;
  order?: number;
}

export interface CompanyStyles {
  global?: StyleMap;
  types?: { [docType: string]: StyleMap };
}

export interface CompanyProfile {
  styles?: CompanyStyles | StyleMap;
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
  first_name: string;
  last_name: string;
  full_name?: string;
  initials?: string;
  role?: string;
  email?: string;
  phone?: string;
  team_ids?: number[];
  team_names?: string[];
}

export interface TeamProjectRef {
  id: number;
  name: string;
  status: string;
  client_name: string;
}

export interface Team {
  id?: number;
  name: string;
  description?: string;
  color?: string;
  parent?: number | null;
  parent_name?: string | null;
  subteam_ids?: number[];
  related_teams?: number[];
  related_team_ids?: number[];
  members?: TeamMember[];
  member_ids?: number[];
  projects_detail?: TeamProjectRef[];
  project_ids?: number[];
  member_count?: number;
  project_count?: number;
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
  clients?: number[];
  clients_detail?: Client[];
  parent?: number | null;
  children?: { id: number; name: string; status: string }[];
  custom_field_defs?: { key: string; label: string; type: string; options?: string[] }[];
  custom_fields?: Record<string, unknown>;
  tracking?: ProjectTracking;
  links?: ProjectLink[];
  styles?: StyleMap;
  contacts: Contact[];
  assignments?: ProjectAssignment[];
  document_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface TrackTask {
  id: string; name: string; start?: string; end?: string; progress?: number;
  planned_end?: string; team?: string; status?: string; deps?: string[];
}
export interface TrackMilestone { name: string; planned?: string; actual?: string; }
export interface TrackRisk { name: string; probability?: number; impact?: number; status?: string; action?: string; }
export interface TrackSnapshot { date?: string; planned?: number; actual?: number; }
export interface TrackRoadmapItem { title: string; date?: string; }
export interface ProjectTracking {
  tasks?: TrackTask[]; milestones?: TrackMilestone[]; risks?: TrackRisk[];
  snapshots?: TrackSnapshot[]; roadmap?: TrackRoadmapItem[];
}

export type DocType = 'pdf' | 'xlsx' | 'docx' | 'pptx' | 'md' | 'a3'
  | 'brochure' | 'lettre' | 'mail' | 'offre';

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
  | 'form_diagram'
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
  // form_diagram : référence un diagramme d'un formulaire lié (rapport)
  diagram_key?: string;
}

export interface LayoutElement {
  id: string;
  type: 'text' | 'image' | 'logo' | 'rect' | 'ellipse' | 'line';
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

export interface A3Page {
  id: string;
  name: string;
  layout: PageLayout & { page_size?: string; orientation?: string };
}

/** Calque dynamique : éléments libres estampillés sur des pages PDF / diapos PPTX. */
export interface Overlay {
  id: string;
  name: string;
  enabled?: boolean;
  doc_type: 'pdf' | 'pptx';
  target: { pages: string };   // 'all' | 'first' | 'last' | 'odd' | 'even' | '1,3-5'
  layout: PageLayout & { page_size?: string; orientation?: string };
}

export interface PptxSettings {
  main_color?: string;
  include_logo?: boolean;
}

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
  pdf_from_docx?: boolean;
  pptx?: PptxSettings;
  // Template A3 (PNG / PDF)
  a3_export?: 'pdf' | 'png';
  a3_pages?: A3Page[];
  // Calques dynamiques (placement libre PDF / PPTX)
  overlays?: Overlay[];
  // En-tête / pied de page configurables (Word, PDF, Lettre)
  header?: HeaderFooter;
  footer?: HeaderFooter;
  /** Contenu spécifique par langue (schéma + réglages), pour TOUS les types. */
  content_i18n?: Record<string, { schema?: Block[] | SchemaField[]; settings?: Partial<TemplateSettings> }>;
}

export interface HeaderFooter {
  enabled?: boolean;
  text?: string;
  /** Texte enrichi (HTML : couleur, gras, listes…). Prioritaire sur `text`. */
  html?: string;
  align?: 'left' | 'center' | 'right';
  show_logo?: boolean;
}

// ---- Classeurs Excel personnalisables ----
export type CellType =
  | 'text'
  | 'integer'
  | 'decimal'
  | 'currency'
  | 'percent'
  | 'date';

export type SheetType = 'table' | 'pivot' | 'info' | 'grid';

/** Cellule d'une grille libre (style/fusion/format par cellule). */
export interface GridCell {
  row: number;
  col: number;
  value?: string | number;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  color?: string;   // #rrggbb texte
  bg?: string;      // #rrggbb fond
  align?: 'left' | 'center' | 'right';
  valign?: 'top' | 'center' | 'bottom';
  size?: number;
  wrap?: boolean;
  number_format?: string;
  border?: boolean;
  col_span?: number;
  row_span?: number;
}

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
  // grid (grille libre)
  cells?: GridCell[];
  col_widths?: Record<string, number>;
  row_heights?: Record<string, number>;
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
  language?: TemplateLanguage;
  /** Langues prises en charge par le modèle (point 5). */
  languages?: TemplateLanguage[];
  /** Nom du modèle par langue, ex: { fr: 'Offre', en: 'Job offer' }. */
  names?: Record<string, string>;
  /** Lecture seule : langues résolues (principale incluse). */
  available_languages?: TemplateLanguage[];
  /** Lecture seule : nom résolu selon la langue demandée. */
  display_name?: string;
}

export type TemplateLanguage = 'fr' | 'en' | 'de' | 'it';
export const LANGUAGES: { value: TemplateLanguage; label: string; flag: string }[] = [
  { value: 'fr', label: 'Français', flag: '🇫🇷' },
  { value: 'en', label: 'English', flag: '🇬🇧' },
  { value: 'de', label: 'Deutsch', flag: '🇩🇪' },
  { value: 'it', label: 'Italiano', flag: '🇮🇹' },
];

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

export type DiagramVariant = 'bar' | 'hbar' | 'pie' | 'donut' | 'line';
export type DiagramMode = 'distribution' | 'crosstab';

export interface FormDiagram {
  id: string;
  title: string;
  variant: DiagramVariant;
  mode: DiagramMode;
  // distribution : répartition des réponses à une question
  question?: string;
  // crosstab : regroupe par une question, agrège une autre
  group_by?: string;
  value?: string;
  agg?: 'count' | 'sum' | 'avg';
  color?: string;
}

export interface DiagramSeries {
  title: string;
  labels: string[];
  values: number[];
  unit?: string;
  error?: string;
}

export interface FormTemplate {
  id?: number;
  name: string;
  description: string;
  schema: FormField[];
  diagrams: FormDiagram[];
  report_template?: number | null;
  language?: TemplateLanguage;
  confidentiality: Confidentiality;
  confidentiality_display?: string;
  success_message: string;
  is_active: boolean;
  scope: 'global' | 'projects';
  projects: number[];
  form_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface OnlineForm {
  id?: number;
  title: string;
  description: string;
  project?: number | null;
  project_name?: string | null;
  template?: number | null;
  template_name?: string | null;
  schema: FormField[];
  diagrams?: FormDiagram[];
  report_template?: number | null;
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


export interface Meeting {
  id?: number; project: number; title: string; date?: string | null;
  location?: string; notes?: string; documents?: number[];
}
export interface JournalEntry {
  id?: number; project: number; meeting?: number | null; document_version?: number | null;
  category: string; confidentiality: string; body: string; author?: string; created_at?: string;
}
export interface ProjectLink {
  id?: number; project: number; category?: string; name: string; url?: string; comment?: string; order?: number;
}
