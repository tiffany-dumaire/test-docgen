import { Pipe, PipeTransform } from '@angular/core';
import { DateTime } from 'luxon';
import { SWISS_LOCALE } from './swiss-date';

/**
 * Affiche une date au format suisse dd.MM.yyyy via Luxon.
 * - `chDate` seul → « 15.01.2026 »
 * - `chDate: true` → « 15.01.2026 14:30 » (avec l'heure)
 * - `chDate: 'time'` → « 14:30 » (heure seule)
 * Accepte une chaîne ISO, un Date, un DateTime ou un timestamp.
 */
@Pipe({ name: 'chDate' })
export class ChDatePipe implements PipeTransform {
  transform(
    value: string | number | Date | DateTime | null | undefined,
    mode: boolean | 'time' = false,
  ): string {
    const dt = this.toDateTime(value);
    if (!dt || !dt.isValid) return '';
    const loc = dt.setLocale(SWISS_LOCALE);
    if (mode === 'time') return loc.toFormat('HH:mm');
    if (mode === true) return loc.toFormat('dd.MM.yyyy HH:mm');
    return loc.toFormat('dd.MM.yyyy');
  }

  private toDateTime(value: string | number | Date | DateTime | null | undefined): DateTime | null {
    if (value == null || value === '') return null;
    if (value instanceof DateTime) return value;
    if (value instanceof Date) return DateTime.fromJSDate(value);
    if (typeof value === 'number') return DateTime.fromMillis(value);
    return DateTime.fromISO(value);
  }
}
