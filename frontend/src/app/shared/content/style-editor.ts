import { Component, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { StyleMap, ElementStyle } from '@core/models';

const ELEMENTS: { key: string; label: string }[] = [
  { key: 'title', label: 'Titre de couverture' },
  { key: 'subtitle', label: 'Sous-titre' },
  { key: 'section', label: 'Titre de section' },
  { key: 'h1', label: 'Titre 1' },
  { key: 'h2', label: 'Titre 2' },
  { key: 'h3', label: 'Titre 3' },
  { key: 'h4', label: 'Titre 4' },
  { key: 'h5', label: 'Titre 5' },
  { key: 'paragraph', label: 'Paragraphe' },
];

@Component({
  selector: 'app-style-editor',
  imports: [FormsModule],
  templateUrl: './style-editor.html',
  styleUrl: './style-editor.scss',
})
export class StyleEditor {
  @Input({ required: true }) styles!: StyleMap;
  elements = ELEMENTS;

  has(k: string) { return !!this.styles[k]; }
  get(k: string): ElementStyle { return this.styles[k] ?? {}; }
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
