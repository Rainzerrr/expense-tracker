import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale/fr';
import type { LocalDate, YearMonth } from '@/shared/lib/time';

const LOCALE = 'fr-FR';

/** Symbole seul, pour les champs de saisie (le montant y est édité à part). */
export const CURRENCY_SYMBOL = '€';
const MINUS_SIGN = '−'; // vrai signe moins, pas le tiret du clavier

const withCentsFormat = new Intl.NumberFormat(LOCALE, { style: 'currency', currency: 'EUR' });
const wholeEurosFormat = new Intl.NumberFormat(LOCALE, {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

/** Formate des centimes en euros. Le signe « − » (vrai signe moins) est géré ici, et nulle part ailleurs. */
export function formatMoney(cents: number, { withCents = true } = {}): string {
  const formatter = withCents ? withCentsFormat : wholeEurosFormat;
  return formatter.format(cents / 100).replace('-', MINUS_SIGN);
}

const capitalize = (text: string) => text.charAt(0).toLocaleUpperCase('fr') + text.slice(1);

/** « Septembre 2026 » */
export function formatMonthTitle(month: YearMonth): string {
  return capitalize(format(parseISO(`${month}-01`), 'LLLL yyyy', { locale: fr }));
}

/** « septembre » : le nom du mois seul, en minuscules, pour l'insérer dans une phrase. */
export function formatMonthName(month: YearMonth): string {
  return format(parseISO(`${month}-01`), 'LLLL', { locale: fr });
}

/** « 17 sept. » */
export function formatDayMonth(date: LocalDate): string {
  return format(parseISO(date), 'd MMM', { locale: fr });
}

/** « 1 sept. 2026 » */
export function formatDayMonthYear(date: LocalDate): string {
  return format(parseISO(date), 'd MMM yyyy', { locale: fr });
}

/** « dim. 20 sept. » */
export function formatWeekdayDayMonth(date: LocalDate): string {
  return format(parseISO(date), 'EEE d MMM', { locale: fr });
}

/** « sept. » : le mois abrégé (« 1–7 sept. »). */
export function formatMonthShort(month: YearMonth): string {
  return format(parseISO(`${month}-01`), 'MMM', { locale: fr });
}

/** « Mercredi » : le jour de la semaine en toutes lettres. */
export function formatWeekdayName(date: LocalDate): string {
  return capitalize(format(parseISO(date), 'EEEE', { locale: fr }));
}
