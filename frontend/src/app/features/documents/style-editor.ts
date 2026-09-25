import { Component, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { StyleMap, ElementStyle } from '../../core/models';

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
  template: `
    <p class="muted hint">Laissez vide pour <b>hériter</b> du niveau supérieur (entreprise → projet → modèle).
      Renseignez une valeur pour surcharger. Cochez « Personnaliser » pour éditer un élément.</p>
    <div class="rows">
      <div class="head">
        <span>Élément</span><span>Personnaliser</span><span>Police</span><span>Taille</span>
        <span>Couleur</span><span>Gras</span><span>Ital.</span><span>Alignement</span>
      </div>
      @for (el of elements; track el.key) {
        <div class="line">
          <span class="lbl">{{ el.label }}</span>
          <span><input type="checkbox" [ngModel]="has(el.key)" (ngModelChange)="toggle(el.key, $event)" /></span>
          @if (has(el.key)) {
            <input [ngModel]="get(el.key).font" (ngModelChange)="set(el.key,'font',$event)" placeholder="ex : Arial" />
            <input type="number" [ngModel]="get(el.key).size" (ngModelChange)="set(el.key,'size',+$event)" placeholder="pt" />
            <input type="color" [ngModel]="get(el.key).color || '#000000'" (ngModelChange)="set(el.key,'color',$event)" />
            <input type="checkbox" [ngModel]="get(el.key).bold" (ngModelChange)="set(el.key,'bold',$event)" />
            <input type="checkbox" [ngModel]="get(el.key).italic" (ngModelChange)="set(el.key,'italic',$event)" />
            <select [ngModel]="get(el.key).align" (ngModelChange)="set(el.key,'align',$event)">
              <option value="">—</option><option value="left">Gauche</option>
              <option value="center">Centre</option><option value="right">Droite</option>
              <option value="justify">Justifié</option>
            </select>
          } @else {
            <span class="inherit" style="grid-column: span 6">hérité</span>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .hint { font-size:.8rem; margin:.2rem 0 .6rem; }
    .rows { display:flex; flex-direction:column; gap:.25rem; font-size:.8rem; }
    .head, .line { display:grid; grid-template-columns:130px 80px 1fr 60px 52px 44px 44px 90px; gap:.4rem; align-items:center; }
    .head { font-weight:700; color:var(--muted); font-size:.72rem; text-transform:uppercase; }
    .line input, .line select { padding:.25rem .35rem; width:100%; }
    .line input[type=checkbox] { width:auto; }
    .lbl { font-weight:600; }
    .inherit { color:var(--muted); font-style:italic; }
    @media(max-width:820px){ .head { display:none; } .line { grid-template-columns:1fr 1fr; } }
  `],
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
