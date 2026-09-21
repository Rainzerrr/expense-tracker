import type { LocalDate, YearMonth } from '@/shared/lib/time';
import {
  formatDayMonth,
  formatDayMonthYear,
  formatWeekdayDayMonth,
  formatMonthName,
  formatMonthShort,
  formatWeekdayName,
  formatMonthTitle,
  formatMoney,
} from './format';

// Intl utilise des espaces insécables : \s les couvre, on normalise avant de comparer.
const normalize = (value: string) => value.replace(/\s/g, ' ');

describe('formatMoney', () => {
  it('formate des centimes en euros avec virgule', () => {
    expect(normalize(formatMoney(1240))).toBe('12,40 €');
  });

  it('sépare les milliers', () => {
    expect(normalize(formatMoney(124500))).toBe('1 245,00 €');
  });

  it('peut masquer les centimes', () => {
    expect(normalize(formatMoney(124500, { withCents: false }))).toBe('1 245 €');
  });

  it('utilise le vrai signe moins (U+2212) pour une dépense', () => {
    expect(normalize(formatMoney(-1240))).toBe('−12,40 €');
  });
});

describe('formats de date', () => {
  it('met une majuscule au titre du mois', () => {
    expect(formatMonthTitle('2026-09' as YearMonth)).toBe('Septembre 2026');
    expect(formatMonthTitle('2027-01' as YearMonth)).toBe('Janvier 2027');
  });

  it('donne le nom du mois en minuscules pour une phrase', () => {
    expect(formatMonthName('2026-12' as YearMonth)).toBe('décembre');
  });

  it('abrège le jour et le mois comme dans les maquettes', () => {
    expect(formatDayMonth('2026-09-17' as LocalDate)).toBe('17 sept.');
    expect(formatDayMonthYear('2027-01-31' as LocalDate)).toBe('31 janv. 2027');
    expect(formatDayMonthYear('2026-09-01' as LocalDate)).toBe('1 sept. 2026');
  });

  it('ajoute le jour de la semaine pour les en-têtes de l’historique', () => {
    expect(formatWeekdayDayMonth('2026-09-20' as LocalDate)).toBe('dim. 20 sept.');
    expect(formatWeekdayDayMonth('2026-09-19' as LocalDate)).toBe('sam. 19 sept.');
  });

  it('abrège le mois et écrit le jour de la semaine en entier', () => {
    expect(formatMonthShort('2026-09' as YearMonth)).toBe('sept.');
    expect(formatWeekdayName('2026-09-16' as LocalDate)).toBe('Mercredi');
  });
});
