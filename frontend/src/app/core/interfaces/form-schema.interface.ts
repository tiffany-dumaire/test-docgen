export type QuestionType =
  | 'text' | 'textarea' | 'email' | 'number' | 'date' | 'time'
  | 'select' | 'radio' | 'checkbox' | 'checkboxes'
  | 'scale' | 'rating' | 'slot' | 'file';

export interface FormField {
  kind?: 'question';
  key: string;
  label: string;
  type: QuestionType;
  hint?: string;
  required?: boolean;
  options?: string[];
  image?: string;          // image d'illustration (URL)
  template_file?: string;  // fichier modèle à télécharger (URL)
  template_file_name?: string;
  // échelle linéaire
  scale_min?: number;
  scale_max?: number;
  scale_min_label?: string;
  scale_max_label?: string;
  // avis (nombre d'étoiles)
  rating_max?: number;
  // créneaux proposés
  slots?: string[];
}

export interface FormContent {
  kind: 'content';
  id: string;
  content_type: 'text' | 'image' | 'file';
  title?: string;
  text?: string;
  url?: string;
  name?: string;
}

export type FormElement = FormField | FormContent;

export interface FormSection {
  kind: 'section';
  id: string;
  title?: string;
  description?: string;
  elements: FormElement[];
}

export interface FormTheme {
  accent?: string;
  background?: string;
  layout?: 'card' | 'cover' | 'plain';
  cover_image?: string;
  button_label?: string;
}

/** Un schéma peut être plat (ancien) ou par sections (nouveau). */
export type FormSchema = FormSection[] | FormField[];

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
