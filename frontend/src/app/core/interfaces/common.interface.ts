/** Réponse paginée standard de l'API (DRF). */
export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface Choice {
  value: string;
  label: string;
}

export interface Choices {
  confidentiality_levels: Choice[];
  document_types: Choice[];
}
