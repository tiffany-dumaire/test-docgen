import { Confidentiality } from '../enums/confidentiality.enum';
import { TemplateLanguage } from './document-template.interface';
import { FormSchema, FormDiagram, FormTheme } from './form-schema.interface';
import { ShortLinkInterface } from './document.interface';

/** Forme brute (API) d'un modèle de formulaire. */
export interface FormTemplateInterface {
  id?: number;
  name: string;
  description: string;
  schema: FormSchema;
  diagrams: FormDiagram[];
  report_template?: number | null;
  language?: TemplateLanguage;
  confidentiality: Confidentiality;
  confidentiality_display?: string;
  success_message: string;
  show_progress?: boolean;
  theme?: FormTheme;
  is_active: boolean;
  scope: 'global' | 'projects';
  projects: number[];
  form_count?: number;
  created_at?: string;
  updated_at?: string;
}

/** Forme brute (API) d'un formulaire en ligne. */
export interface OnlineFormInterface {
  id?: number;
  title: string;
  description: string;
  project?: number | null;
  project_name?: string | null;
  template?: number | null;
  template_name?: string | null;
  schema: FormSchema;
  diagrams?: FormDiagram[];
  report_template?: number | null;
  confidentiality: Confidentiality;
  confidentiality_display?: string;
  is_open: boolean;
  deadline?: string | null;
  success_message: string;
  show_progress?: boolean;
  theme?: FormTheme;
  short_link?: ShortLinkInterface | null;
  short_url?: string | null;
  submission_count?: number;
  // public
  logo_url?: string | null;
  company_name?: string | null;
}

/** Forme brute (API) d'une soumission de formulaire. */
export interface FormSubmissionInterface {
  id: number;
  form: number;
  data: Record<string, unknown>;
  submitted_at: string;
}
