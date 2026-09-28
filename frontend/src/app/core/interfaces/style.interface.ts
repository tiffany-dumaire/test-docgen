export interface ElementStyle {
  font?: string;
  size?: number;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  color?: string;
  align?: 'left' | 'center' | 'right' | 'justify';
  space_after?: number;

  // Titres : numérotation + saut de page
  /** Titre numéroté (Titre 1, 1.1, …) ou non. */
  numbered?: boolean;
  /** Format de numérotation : 'decimal' (1, 1.1), 'decimal-paren' (1)), 'upper-alpha' (A.), 'upper-roman' (I.). */
  number_format?: string;
  /** Décalage (retrait) de la numérotation, en points. */
  number_indent?: number;
  /** Commence sur une nouvelle page (saut de page avant le titre). */
  page_break?: boolean;

  // Listes : format des puces / numéros + décalage
  /** Format des listes : puces ('disc', 'circle', 'square', 'dash') ou numéros ('decimal', 'lower-alpha', 'upper-roman'). */
  list_format?: string;
  /** Décalage (retrait) de la liste, en points. */
  list_indent?: number;
}
export type StyleMap = Record<string, ElementStyle>;
