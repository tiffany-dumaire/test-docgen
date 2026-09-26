/** Forme brute (API) d'une réunion projet. */
export interface MeetingInterface {
  id?: number;
  project: number;
  title: string;
  date?: string | null;
  location?: string;
  notes?: string;
  documents?: number[];
  cancelled?: boolean;
}

/** Forme brute (API) d'une entrée de journal. */
export interface JournalEntryInterface {
  id?: number;
  project?: number | null;
  project_name?: string;
  client?: number | null;
  meeting?: number | null;
  document_version?: number | null;
  category: string;
  category_label?: string;
  confidentiality: string;
  body?: string;
  body_html?: string;
  is_automatic?: boolean;
  event?: string;
  author?: string;
  created_at?: string;
}

/** Forme brute (API) d'un lien utile projet. */
export interface ProjectLinkInterface {
  id?: number;
  project: number;
  category?: string;
  name: string;
  url?: string;
  comment?: string;
  order?: number;
}
