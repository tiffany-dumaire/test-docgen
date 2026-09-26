import { Component, Input, signal, computed } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

interface Cell { date: Date | null; items: any[]; today: boolean; }

@Component({
  selector: 'app-meeting-calendar',
  imports: [DatePipe, MatIconModule, MatButtonModule],
  templateUrl: './meeting-calendar.html',
  styleUrl: './meeting-calendar.scss',
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
