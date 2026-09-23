import {
  Component,
  ElementRef,
  Input,
  Output,
  EventEmitter,
  ViewChild,
  AfterViewInit,
} from '@angular/core';

/**
 * Éditeur de texte enrichi léger (contenteditable + barre d'outils).
 * Produit du HTML simple (titres, listes, gras/italique, liens) exploité
 * par le générateur de documents.
 */
@Component({
  selector: 'app-rich-text-editor',
  template: `
    <div class="rte">
      <div class="toolbar">
        <select (change)="format($event)" title="Style">
          <option value="">Paragraphe</option>
          <option value="H1">Titre 1</option>
          <option value="H2">Titre 2</option>
          <option value="H3">Titre 3</option>
          <option value="H4">Titre 4</option>
          <option value="H5">Titre 5</option>
        </select>
        <button type="button" (click)="cmd('bold')" title="Gras"><b>G</b></button>
        <button type="button" (click)="cmd('italic')" title="Italique"><i>I</i></button>
        <button type="button" (click)="cmd('underline')" title="Souligné"><u>S</u></button>
        <span class="sep"></span>
        <button type="button" (click)="cmd('insertUnorderedList')" title="Liste à puces">• —</button>
        <button type="button" (click)="cmd('insertOrderedList')" title="Liste numérotée">1. —</button>
        <span class="sep"></span>
        <button type="button" (click)="addLink()" title="Lien">🔗</button>
        <button type="button" (click)="cmd('removeFormat')" title="Effacer le format">✕</button>
      </div>
      <div
        #editor
        class="editable"
        contenteditable="true"
        (input)="onInput()"
        (blur)="onInput()"
      ></div>
    </div>
  `,
  styles: [
    `
      .rte { border: 1px solid var(--border); border-radius: 8px; overflow: hidden; }
      .toolbar { display: flex; flex-wrap: wrap; gap: 0.2rem; padding: 0.35rem; background: var(--bg); border-bottom: 1px solid var(--border); align-items: center; }
      .toolbar button { border: 1px solid var(--border); background: #fff; border-radius: 6px; padding: 0.2rem 0.5rem; cursor: pointer; font-size: 0.85rem; min-width: 2rem; }
      .toolbar button:hover { background: var(--primary-light); }
      .toolbar select { width: auto; padding: 0.2rem 0.4rem; font-size: 0.82rem; }
      .sep { width: 1px; height: 1.2rem; background: var(--border); margin: 0 0.2rem; }
      .editable { min-height: 130px; padding: 0.7rem 0.9rem; font-size: 0.9rem; outline: none; }
      .editable:focus { box-shadow: inset 0 0 0 2px var(--primary-light); }
      .editable h1 { font-size: 1.4rem; } .editable h2 { font-size: 1.2rem; }
      .editable h3 { font-size: 1.05rem; } .editable h4, .editable h5 { font-size: 1rem; }
    `,
  ],
})
export class RichTextEditor implements AfterViewInit {
  @Input() value = '';
  @Output() valueChange = new EventEmitter<string>();
  @ViewChild('editor') editor!: ElementRef<HTMLDivElement>;

  ngAfterViewInit() {
    this.editor.nativeElement.innerHTML = this.value || '';
  }

  onInput() {
    this.valueChange.emit(this.editor.nativeElement.innerHTML);
  }

  cmd(command: string) {
    document.execCommand(command, false);
    this.editor.nativeElement.focus();
    this.onInput();
  }

  format(event: Event) {
    const tag = (event.target as HTMLSelectElement).value || 'P';
    document.execCommand('formatBlock', false, tag);
    this.onInput();
  }

  addLink() {
    const url = prompt('URL du lien :', 'https://');
    if (url) {
      document.execCommand('createLink', false, url);
      this.onInput();
    }
  }
}
