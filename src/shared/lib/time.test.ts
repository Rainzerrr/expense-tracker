import {
  addDays,
  addMonths,
  daysBetween,
  daysInMonth,
  isLocalDate,
  monthEnd,
  monthOf,
  monthStart,
  todayInLisbon,
} from './time';
import type { LocalDate, YearMonth } from './time';

const date = (value: string) => value as LocalDate;
const month = (value: string) => value as YearMonth;

describe('isLocalDate', () => {
  it('accepte une date valide', () => {
    expect(isLocalDate('2026-09-20')).toBe(true);
  });

  it.each(['2026-02-30', '2026-13-01', '2026-9-2', '20/09/2026', ''])('refuse %j', (value) => {
    expect(isLocalDate(value)).toBe(false);
  });
});

describe('todayInLisbon', () => {
  it('utilise le fuseau de Lisbonne, pas celui de l’appareil', () => {
    // 23 h 30 UTC en septembre = 00 h 30 le lendemain à Lisbonne (UTC+1).
    expect(todayInLisbon(new Date('2026-09-20T23:30:00Z'))).toBe('2026-09-21');
    // En hiver, Lisbonne est à UTC+0.
    expect(todayInLisbon(new Date('2027-01-15T23:30:00Z'))).toBe('2027-01-15');
  });
});

describe('mois', () => {
  it('septembre a 30 jours, pas 31', () => {
    expect(monthEnd(month('2026-09'))).toBe('2026-09-30');
    expect(daysInMonth(month('2026-09'))).toBe(30);
  });

  it('gère décembre, janvier et février', () => {
    expect(daysInMonth(month('2026-12'))).toBe(31);
    expect(daysInMonth(month('2027-02'))).toBe(28);
    expect(daysInMonth(month('2028-02'))).toBe(29);
  });

  it('déduit le mois et son premier jour', () => {
    expect(monthOf(date('2026-09-20'))).toBe('2026-09');
    expect(monthStart(month('2026-09'))).toBe('2026-09-01');
  });

  it('passe d’une année à l’autre', () => {
    expect(addMonths(month('2026-12'), 1)).toBe('2027-01');
    expect(addMonths(month('2027-01'), -1)).toBe('2026-12');
    expect(addMonths(month('2026-09'), 0)).toBe('2026-09');
  });
});

describe('daysBetween', () => {
  it('compte les jours calendaires', () => {
    expect(daysBetween(date('2026-09-01'), date('2026-09-20'))).toBe(19);
    expect(daysBetween(date('2026-09-20'), date('2026-09-01'))).toBe(-19);
  });

  it('ne se trompe pas au changement d’heure (dernier dimanche d’octobre)', () => {
    expect(daysBetween(date('2026-10-24'), date('2026-10-26'))).toBe(2);
  });

  it('le séjour du 1er septembre 2026 au 31 janvier 2027 dure 153 jours', () => {
    expect(daysBetween(date('2026-09-01'), date('2027-01-31')) + 1).toBe(153);
  });
});

describe('addDays', () => {
  it('recule et avance en changeant de mois ou d’année', () => {
    expect(addDays(date('2026-09-20'), -1)).toBe('2026-09-19');
    expect(addDays(date('2026-10-01'), -1)).toBe('2026-09-30');
    expect(addDays(date('2026-12-31'), 1)).toBe('2027-01-01');
  });
});
