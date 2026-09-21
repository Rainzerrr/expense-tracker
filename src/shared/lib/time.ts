import {
  addDays as addDaysToDate,
  differenceInCalendarDays,
  endOfMonth,
  format,
  isValid,
  parseISO,
} from 'date-fns';
import type { Brand } from './brand';

/** Date locale « YYYY-MM-DD » (fuseau Europe/Lisbon), sans heure. */
export type LocalDate = Brand<string, 'LocalDate'>;
/** Mois « YYYY-MM ». */
export type YearMonth = Brand<string, 'YearMonth'>;
/** Horodatage ISO 8601 en UTC. */
export type IsoInstant = Brand<string, 'IsoInstant'>;

/** Date de modification des éléments fournis par défaut : toute modification de l'utilisateur est donc plus récente. */
export const EPOCH_INSTANT = '1970-01-01T00:00:00.000Z' as IsoInstant;

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;
const DATE_FORMAT = 'yyyy-MM-dd';

// « en-CA » formate en YYYY-MM-DD ; le fuseau est fixé, indépendant de celui de l'appareil.
const lisbonDateFormat = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Lisbon',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

export function isLocalDate(value: string): value is LocalDate {
  if (!DATE_PATTERN.test(value)) return false;
  const parsed = parseISO(value);
  // Le aller-retour refuse les dates inexistantes (30 février).
  return isValid(parsed) && format(parsed, DATE_FORMAT) === value;
}

export function isYearMonth(value: string): value is YearMonth {
  return MONTH_PATTERN.test(value);
}

/** Le jour courant à Lisbonne : une dépense du 19 septembre reste au 19 quel que soit l'appareil. */
export function todayInLisbon(now: Date = new Date()): LocalDate {
  return lisbonDateFormat.format(now) as LocalDate;
}

export function nowInstant(now: Date = new Date()): IsoInstant {
  return now.toISOString() as IsoInstant;
}

export function monthOf(date: LocalDate): YearMonth {
  return date.slice(0, 7) as YearMonth;
}

export function monthStart(month: YearMonth): LocalDate {
  return `${month}-01` as LocalDate;
}

/** Dernier jour du mois (28, 29, 30 ou 31), jamais écrit en dur. */
export function monthEnd(month: YearMonth): LocalDate {
  return format(endOfMonth(parseISO(monthStart(month))), DATE_FORMAT) as LocalDate;
}

export function addMonths(month: YearMonth, delta: number): YearMonth {
  const [year, monthNumber] = month.split('-').map(Number) as [number, number];
  const index = year * 12 + (monthNumber - 1) + delta;
  const nextYear = Math.floor(index / 12);
  const nextMonth = (index % 12) + 1;
  return `${nextYear}-${String(nextMonth).padStart(2, '0')}` as YearMonth;
}

export function daysInMonth(month: YearMonth): number {
  return daysBetween(monthStart(month), monthEnd(month)) + 1;
}

/** Nombre de jours entre deux dates (positif si `to` est après `from`). */
export function daysBetween(from: LocalDate, to: LocalDate): number {
  return differenceInCalendarDays(parseISO(to), parseISO(from));
}

export function addDays(date: LocalDate, delta: number): LocalDate {
  return format(addDaysToDate(parseISO(date), delta), DATE_FORMAT) as LocalDate;
}
