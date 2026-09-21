import { addMonths, daysBetween, monthOf } from '@/shared/lib/time';
import type { LocalDate, YearMonth } from '@/shared/lib/time';

export interface Stay {
  start: LocalDate;
  end: LocalDate;
}

/** Erasmus à Lisbonne : 153 jours. Modifiable dans les réglages (étape 6). */
export const DEFAULT_STAY: Stay = {
  start: '2026-09-01' as LocalDate,
  end: '2027-01-31' as LocalDate,
};

export function stayLengthDays(stay: Stay): number {
  return daysBetween(stay.start, stay.end) + 1;
}

/** Numéro du jour dans le séjour (« Jour 20 sur 153 »), borné à [0, durée]. */
export function stayDayNumber(stay: Stay, today: LocalDate): number {
  const day = daysBetween(stay.start, today) + 1;
  return Math.min(Math.max(day, 0), stayLengthDays(stay));
}

/** Part du séjour écoulée, entre 0 et 1. */
export function stayProgress(stay: Stay, today: LocalDate): number {
  return stayDayNumber(stay, today) / stayLengthDays(stay);
}

/** Tous les mois touchés par le séjour, dans l'ordre. */
export function stayMonths(stay: Stay): YearMonth[] {
  const first = monthOf(stay.start);
  const last = monthOf(stay.end);
  const months: YearMonth[] = [];
  for (let month = first; month <= last; month = addMonths(month, 1)) months.push(month);
  return months;
}

/**
 * Mois que l'on peut afficher : du début du séjour jusqu'au mois en cours (on ne navigue pas
 * dans le futur). Avant le séjour, seul le premier mois ; après, tous.
 */
export function navigableMonths(stay: Stay, today: LocalDate): YearMonth[] {
  const months = stayMonths(stay);
  const current = monthOf(today);
  const reachable = months.filter((month) => month <= current);
  return reachable.length > 0 ? reachable : months.slice(0, 1);
}
