/** Niveaux de confidentialité (documents, formulaires, versions). */
export enum Confidentiality {
  Public = 'public',
  Internal = 'internal',
  Confidential = 'confidential',
  Restricted = 'restricted',
}

/** Libellés d'affichage FR par niveau. */
export const CONFIDENTIALITY_LABELS: Record<Confidentiality, string> = {
  [Confidentiality.Public]: 'Public',
  [Confidentiality.Internal]: 'Interne',
  [Confidentiality.Confidential]: 'Confidentiel',
  [Confidentiality.Restricted]: 'Strictement confidentiel',
};
