import { ExcelWorkbook } from './excel.interface';
import { StyleMap } from './style.interface';

export type DocType = 'pdf' | 'xlsx' | 'docx' | 'pptx' | 'md' | 'a3'
  | 'brochure' | 'lettre' | 'mail' | 'offre';

export type TemplateLanguage = 'fr' | 'en' | 'de' | 'it';
export const LANGUAGES: { value: TemplateLanguage; label: string; flag: string }[] = [
  { value: 'fr', label: 'Français', flag: '🇫🇷' },
  { value: 'en', label: 'English', flag: '🇬🇧' },
  { value: 'de', label: 'Deutsch', flag: '🇩🇪' },
  { value: 'it', label: 'Italiano', flag: '🇮🇹' },
];

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

export interface HeaderFooter {
  enabled?: boolean;
  text?: string;
  /** Texte enrichi (HTML : couleur, gras, listes…). Prioritaire sur `text`. */
  html?: string;
  align?: 'left' | 'center' | 'right';
  show_logo?: boolean;
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
