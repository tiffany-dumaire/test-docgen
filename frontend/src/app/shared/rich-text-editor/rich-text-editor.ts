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
  templateUrl: './rich-text-editor.html',
  styleUrl: './rich-text-editor.scss',
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

  setColor(event: Event) {
    const color = (event.target as HTMLInputElement).value;
    this.editor.nativeElement.focus();
    document.execCommand('foreColor', false, color);
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
