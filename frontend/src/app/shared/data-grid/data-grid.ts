import { Component, Input, Output, EventEmitter } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TableData } from '@core/models';

/**
 * Éditeur de tableau façon tableur : ajout / suppression de lignes et de
 * colonnes, édition des cellules et (optionnellement) des en-têtes de colonnes.
 * Le composant modifie l'objet `model` en place (même référence que celle
 * stockée dans les données du document).
 */
@Component({
  selector: 'app-data-grid',
  imports: [FormsModule],
  templateUrl: './data-grid.html',
  styleUrl: './data-grid.scss',
})
export class DataGrid {
  @Input() model!: TableData;
  @Input() allowColumns = false;
  @Output() modelChange = new EventEmitter<TableData>();

  cell(r: number, c: number): string {
    return this.model.rows[r]?.[c] ?? '';
  }
  setCell(r: number, c: number, value: string) {
    while (this.model.rows[r].length < this.model.columns.length) {
      this.model.rows[r].push('');
    }
    this.model.rows[r][c] = value;
    this.changed();
  }
  addRow() {
    this.model.rows.push(this.model.columns.map(() => ''));
    this.changed();
  }
  removeRow(i: number) {
    this.model.rows.splice(i, 1);
    this.changed();
  }
  addColumn() {
    this.model.columns.push(`Colonne ${this.model.columns.length + 1}`);
    this.model.rows.forEach((r) => r.push(''));
    this.changed();
  }
  removeColumn(i: number) {
    this.model.columns.splice(i, 1);
    this.model.rows.forEach((r) => r.splice(i, 1));
    this.changed();
  }
  changed() {
    this.modelChange.emit(this.model);
  }
}
