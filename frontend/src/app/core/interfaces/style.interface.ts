export interface ElementStyle {
  font?: string; size?: number; bold?: boolean; italic?: boolean;
  color?: string; align?: 'left' | 'center' | 'right' | 'justify';
  space_after?: number;
}
export type StyleMap = { [element: string]: ElementStyle };
