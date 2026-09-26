/** Réunion projet (modèle applicatif, attributs camelCase). */
export class Meeting {
  id?: number;
  project!: number;
  title = '';
  date?: string | null;
  location?: string;
  notes?: string;
  documents?: number[];
  cancelled?: boolean;
}

/** Entrée de journal projet / client (modèle applicatif, attributs camelCase). */
export class JournalEntry {
  id?: number;
  project?: number | null;
  projectName?: string;
  client?: number | null;
  meeting?: number | null;
  documentVersion?: number | null;
  category = '';
  categoryLabel?: string;
  confidentiality = '';
  body?: string;
  bodyHtml?: string;
  isAutomatic?: boolean;
  event?: string;
  author?: string;
  createdAt?: string;
}

/** Lien utile projet (modèle applicatif, attributs camelCase). */
export class ProjectLink {
  id?: number;
  project!: number;
  category?: string;
  name = '';
  url?: string;
  comment?: string;
  order?: number;
}
