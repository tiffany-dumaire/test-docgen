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

/** Image (logo) positionnée dans une feuille (grille). */
export interface SheetImage {
  source: 'company' | 'url';
  url?: string;        // si source === 'url'
  col: number;         // cellule d'ancrage (coin haut-gauche, 1-indexé)
  row: number;
  width?: number;      // px
  height?: number;     // px
  offset_x?: number;   // décalage px depuis le coin de la cellule
  offset_y?: number;   // décalage px
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
  images?: SheetImage[];
}

export interface ExcelWorkbook {
  sheets: ExcelSheet[];
}
