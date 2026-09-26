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
  template: `
    <div class="grid-wrap">
      <table class="grid">
        <thead>
          <tr>
            <th class="rownum"></th>
            @for (col of model.columns; track $index) {
              <th>
                @if (allowColumns) {
                  <div class="colhead">
                    <input [(ngModel)]="model.columns[$index]" placeholder="Colonne" (ngModelChange)="changed()" />
                    <button class="mini" title="Supprimer la colonne" (click)="removeColumn($index)">✕</button>
                  </div>
                } @else {
                  <span>{{ col }}</span>
                }
              </th>
            }
          </tr>
        </thead>
        <tbody>
          @for (row of model.rows; track $index; let ri = $index) {
            <tr>
              <td class="rownum">{{ ri + 1 }}</td>
              @for (col of model.columns; track $index; let ci = $index) {
                <td>
                  <input [ngModel]="cell(ri, ci)" (ngModelChange)="setCell(ri, ci, $event)" />
                </td>
              }
              <td class="rowdel">
                <button class="mini" title="Supprimer la ligne" (click)="removeRow(ri)">✕</button>
              </td>
            </tr>
          }
          @if (!model.rows.length) {
            <tr><td [attr.colspan]="model.columns.length + 1" class="muted empty-row">Aucune ligne. Cliquez sur « + Ligne ».</td></tr>
          }
        </tbody>
      </table>
      <div class="grid-actions">
        <button class="btn btn-sm btn-ghost" (click)="addRow()">+ Ligne</button>
        @if (allowColumns) {
          <button class="btn btn-sm btn-ghost" (click)="addColumn()">+ Colonne</button>
        }
      </div>
    </div>
  `,
  styles: [
    `
      .grid-wrap { overflow-x: auto; }
      table.grid { border-collapse: collapse; width: 100%; }
      table.grid th, table.grid td { border: 1px solid var(--border); padding: 0; }
      table.grid th { background: var(--bg); padding: 0.2rem; }
      table.grid input {
        border: none; border-radius: 0; padding: 0.45rem 0.5rem; font-size: 0.85rem; background: transparent;
      }
      table.grid input:focus { box-shadow: inset 0 0 0 2px var(--primary); }
      .colhead { display: flex; align-items: center; gap: 0.2rem; }
      .colhead input { font-weight: 600; }
      .rownum { width: 2rem; text-align: center; color: var(--muted); background: var(--bg); font-size: 0.75rem; }
      .rowdel { width: 2rem; border: none !important; text-align: center; }
      .empty-row { text-align: center; padding: 0.8rem; }
      .mini {
        border: none; background: transparent; color: var(--muted); cursor: pointer;
        font-size: 0.8rem; padding: 0.1rem 0.3rem; border-radius: 4px;
      }
      .mini:hover { background: #fee2e2; color: var(--danger); }
      .grid-actions { display: flex; gap: 0.5rem; margin-top: 0.5rem; }
    `,
  ],
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
