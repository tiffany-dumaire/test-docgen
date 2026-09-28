import { Component, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { StyleMap, ElementStyle } from '@core/models';

/** Familles de styles : chacune expose un jeu de propriétés différent. */
type StyleKind = 'title' | 'para' | 'list' | 'link';

interface StyleDef {
  key: string;
  label: string;
  kind: StyleKind;
}

/** Ordre et libellés conformes à la charte documentaire (Word / PDF). */
const ELEMENTS: StyleDef[] = [
  { key: 'title', label: 'Titre', kind: 'title' },
  { key: 'h1', label: 'Titre 1', kind: 'title' },
  { key: 'h2', label: 'Titre 2', kind: 'title' },
  { key: 'h3', label: 'Titre 3', kind: 'title' },
  { key: 'h4', label: 'Titre 4', kind: 'title' },
  { key: 'h5', label: 'Titre 5', kind: 'title' },
  { key: 'subtitle', label: 'Sous-titre', kind: 'title' },
  { key: 'code', label: 'Code', kind: 'para' },
  { key: 'paragraph', label: 'Paragraphe (Normal)', kind: 'para' },
  { key: 'link', label: 'Lien', kind: 'link' },
  { key: 'numbered_list', label: 'Liste à chiffre', kind: 'list' },
  { key: 'bullet_list', label: 'Liste à puce', kind: 'list' },
];

const NUMBER_FORMATS = [
  { value: 'decimal', label: '1, 1.1, 1.1.1' },
  { value: 'decimal-paren', label: '1), 2), 3)' },
  { value: 'upper-alpha', label: 'A., B., C.' },
  { value: 'lower-alpha', label: 'a), b), c)' },
  { value: 'upper-roman', label: 'I., II., III.' },
];

const LIST_BULLETS = [
  { value: 'disc', label: '● Pastille' },
  { value: 'circle', label: '○ Cercle' },
  { value: 'square', label: '▪ Carré' },
  { value: 'dash', label: '– Tiret' },
];

const LIST_NUMBERS = [
  { value: 'decimal', label: '1. 2. 3.' },
  { value: 'decimal-paren', label: '1) 2) 3)' },
  { value: 'lower-alpha', label: 'a) b) c)' },
  { value: 'upper-alpha', label: 'A. B. C.' },
  { value: 'upper-roman', label: 'I. II. III.' },
];

@Component({
  selector: 'app-style-editor',
  imports: [
    FormsModule,
    MatExpansionModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatCheckboxModule,
  ],
  templateUrl: './style-editor.html',
  styleUrl: './style-editor.scss',
})
export class StyleEditor {
  @Input({ required: true }) styles!: StyleMap;
  elements = ELEMENTS;
  numberFormats = NUMBER_FORMATS;

  /** Options de format selon la nature de la liste (chiffres vs puces). */
  listFormats(key: string) {
    return key === 'numbered_list' ? LIST_NUMBERS : LIST_BULLETS;
  }

  isTitle(k: string) {
    return this.kind(k) === 'title';
  }
  isList(k: string) {
    return this.kind(k) === 'list';
  }
  /** Alignement affiché pour tout sauf les listes (héritage du paragraphe). */
  showAlign(k: string) {
    return this.kind(k) !== 'list';
  }
  private kind(k: string): StyleKind {
    return ELEMENTS.find((e) => e.key === k)?.kind ?? 'para';
  }

  has(k: string) {
    return !!this.styles[k];
  }
  get(k: string): ElementStyle {
    return this.styles[k] ?? {};
  }
  toggle(k: string, on: boolean) {
    if (on) this.styles[k] = this.styles[k] ?? {};
    else delete this.styles[k];
  }
  set(k: string, prop: keyof ElementStyle, value: unknown) {
    this.styles[k] = this.styles[k] ?? {};
    if (value === '' || value === null || (typeof value === 'number' && isNaN(value))) {
      delete (this.styles[k] as Record<string, unknown>)[prop];
    } else {
      (this.styles[k] as Record<string, unknown>)[prop] = value;
    }
  }
}
