import { Confidentiality } from '../enums/confidentiality.enum';
import { TemplateLanguage } from '../interfaces/document-template.interface';
import { FormSchema, FormDiagram, FormTheme } from '../interfaces/form-schema.interface';
import { ShortLink } from './document.model';

/** Modèle de formulaire (modèle applicatif, attributs camelCase). */
export class FormTemplate {
  id?: number;
  name = '';
  description = '';
  schema: FormSchema = [];
  diagrams: FormDiagram[] = [];
  reportTemplate?: number | null;
  language?: TemplateLanguage;
  confidentiality: Confidentiality = Confidentiality.Internal;
  confidentialityDisplay?: string;
  successMessage = '';
  showProgress?: boolean;
  theme?: FormTheme;
  isActive = true;
  scope: 'global' | 'projects' = 'global';
  projects: number[] = [];
  formCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

/** Formulaire en ligne (modèle applicatif, attributs camelCase). */
export class OnlineForm {
  id?: number;
  title = '';
  description = '';
  project?: number | null;
  projectName?: string | null;
  template?: number | null;
  templateName?: string | null;
  schema: FormSchema = [];
  diagrams?: FormDiagram[];
  reportTemplate?: number | null;
  confidentiality: Confidentiality = Confidentiality.Internal;
  confidentialityDisplay?: string;
  isOpen = true;
  deadline?: string | null;
  successMessage = '';
  showProgress?: boolean;
  theme?: FormTheme;
  shortLink?: ShortLink | null;
  shortUrl?: string | null;
  submissionCount?: number;
  // public
  logoUrl?: string | null;
  companyName?: string | null;
}

/** Soumission de formulaire (modèle applicatif, attributs camelCase). */
export class FormSubmission {
  id!: number;
  form!: number;
  data: Record<string, unknown> = {};
  submittedAt!: string;
}
