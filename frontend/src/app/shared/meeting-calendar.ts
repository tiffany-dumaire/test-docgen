import { Component, Input, signal, computed } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

interface Cell { date: Date | null; items: any[]; today: boolean; }

@Component({
  selector: 'app-meeting-calendar',
  imports: [DatePipe, MatIconModule, MatButtonModule],
  template: `
    <div class="cal">
      <div class="cal-head">
        <button mat-icon-button (click)="prev()"><mat-icon>chevron_left</mat-icon></button>
        <div class="month">{{ label() }}</div>
        <button mat-icon-button (click)="next()"><mat-icon>chevron_right</mat-icon></button>
        <span class="grow"></span>
        <button mat-stroked-button (click)="goToday()"><mat-icon>today</mat-icon> Aujourd'hui</button>
      </div>
      <div class="dow">
        @for (d of dows; track d) { <div>{{ d }}</div> }
      </div>
      <div class="grid">
        @for (c of cells(); track $index) {
          <div class="cell" [class.empty]="!c.date" [class.today]="c.today">
            @if (c.date) {
              <div class="num">{{ c.date.getDate() }}</div>
              @for (m of c.items; track m.id) {
                <div class="ev" [title]="m.title + (m.project_name ? ' · ' + m.project_name : '')">
                  <span class="dot"></span>{{ m.date ? (m.date | date:'HH:mm') : '' }} {{ m.title }}
                </div>
              }
            }
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .cal { background: var(--mat-sys-surface); border: 1px solid var(--mat-sys-outline-variant); border-radius: 16px; padding: 1rem; box-shadow: var(--shadow); }
    .cal-head { display: flex; align-items: center; gap: .5rem; margin-bottom: .6rem; }
    .month { font-weight: 700; font-size: 1.1rem; text-transform: capitalize; min-width: 160px; text-align: center; }
    .grow { flex: 1; }
    .dow { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; margin-bottom: 4px; }
    .dow div { text-align: center; font-size: .72rem; font-weight: 700; color: var(--mat-sys-outline); text-transform: uppercase; }
    .grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; }
    .cell { min-height: 92px; border: 1px solid var(--mat-sys-outline-variant); border-radius: 10px; padding: 4px 5px; background: var(--mat-sys-surface-container-low); }
    .cell.empty { background: transparent; border: none; }
    .cell.today { outline: 2px solid var(--mat-sys-primary); }
    .num { font-size: .75rem; font-weight: 700; color: var(--mat-sys-outline); text-align: right; }
    .ev { font-size: .68rem; background: color-mix(in srgb, var(--mat-sys-primary) 14%, var(--mat-sys-surface)); color: var(--mat-sys-on-surface); border-radius: 6px; padding: 2px 5px; margin-top: 3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .ev .dot { display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: var(--mat-sys-primary); margin-right: 4px; }
  `],
})
export class MeetingCalendar {
  private _meetings: any[] = [];
  @Input() set meetings(v: any[]) { this._meetings = v || []; this.bump.set(this.bump() + 1); }

  cursor = signal(new Date());
  bump = signal(0);
  dows = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

  label = computed(() => {
    this.bump();
    return this.cursor().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  });

  cells = computed<Cell[]>(() => {
    this.bump();
    const cur = this.cursor();
    const y = cur.getFullYear(), mo = cur.getMonth();
    const first = new Date(y, mo, 1);
    const startDow = (first.getDay() + 6) % 7; // lundi = 0
    const daysInMonth = new Date(y, mo + 1, 0).getDate();
    const today = new Date();
    const byDay: Record<string, any[]> = {};
    for (const m of this._meetings) {
      if (!m.date) continue;
      const d = new Date(m.date);
      if (d.getFullYear() === y && d.getMonth() === mo) {
        const k = String(d.getDate());
        (byDay[k] = byDay[k] || []).push(m);
      }
    }
    for (const k in byDay) byDay[k].sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    const cells: Cell[] = [];
    for (let i = 0; i < startDow; i++) cells.push({ date: null, items: [], today: false });
    for (let d = 1; d <= daysInMonth; d++) {
      const isToday = today.getFullYear() === y && today.getMonth() === mo && today.getDate() === d;
      cells.push({ date: new Date(y, mo, d), items: byDay[String(d)] || [], today: isToday });
    }
    while (cells.length % 7 !== 0) cells.push({ date: null, items: [], today: false });
    return cells;
  });

  prev() { const c = new Date(this.cursor()); c.setMonth(c.getMonth() - 1); this.cursor.set(c); }
  next() { const c = new Date(this.cursor()); c.setMonth(c.getMonth() + 1); this.cursor.set(c); }
  goToday() { this.cursor.set(new Date()); }
}
