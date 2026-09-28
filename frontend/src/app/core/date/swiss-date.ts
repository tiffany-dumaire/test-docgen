import { Provider } from '@angular/core';
import { MAT_DATE_LOCALE } from '@angular/material/core';
import {
  provideLuxonDateAdapter,
  MAT_LUXON_DATE_ADAPTER_OPTIONS,
} from '@angular/material-luxon-adapter';
import { DateTime } from 'luxon';

/** Locale suisse romande : dates au format jour.mois.année. */
export const SWISS_LOCALE = 'fr-CH';

/**
 * Formats Material pour le datepicker Luxon : saisie et affichage en dd.MM.yyyy
 * (format suisse), le reste sur des formats courts explicites.
 */
export const SWISS_LUXON_FORMATS = {
  parse: {
    dateInput: 'dd.MM.yyyy',
  },
  display: {
    dateInput: 'dd.MM.yyyy',
    monthYearLabel: 'LLL yyyy',
    dateA11yLabel: 'dd.MM.yyyy',
    monthYearA11yLabel: 'LLLL yyyy',
  },
} as const;

/**
 * Fournit l'adaptateur de dates Luxon configuré pour la Suisse (dd.MM.yyyy,
 * locale fr-CH). À enregistrer une fois dans app.config.
 */
export function provideSwissDates(): Provider[] {
  return [
    provideLuxonDateAdapter(SWISS_LUXON_FORMATS),
    { provide: MAT_DATE_LOCALE, useValue: SWISS_LOCALE },
    { provide: MAT_LUXON_DATE_ADAPTER_OPTIONS, useValue: { useUtc: false, firstDayOfWeek: 1 } },
  ];
}

/**
 * Convertit une valeur de modèle (chaîne ISO « yyyy-MM-dd », ISO complet, Date)
 * en DateTime Luxon pour alimenter un mat-datepicker. Renvoie null si vide.
 */
export function isoToLuxon(value: string | Date | null | undefined): DateTime | null {
  if (!value) return null;
  if (value instanceof Date) {
    const dt = DateTime.fromJSDate(value);
    return dt.isValid ? dt : null;
  }
  const s = String(value);
  const dt = DateTime.fromISO(s);
  return dt.isValid ? dt : null;
}

/**
 * Convertit un DateTime Luxon (sortie d'un mat-datepicker) en chaîne ISO date
 * « yyyy-MM-dd » pour l'enregistrement côté modèle. Renvoie null si vide.
 */
export function luxonToIso(value: DateTime | null | undefined): string | null {
  if (!value || !value.isValid) return null;
  return value.toFormat('yyyy-MM-dd');
}
