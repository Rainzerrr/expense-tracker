import type { LocalDate, YearMonth } from '@/shared/lib/time';
import {
  DEFAULT_STAY,
  navigableMonths,
  stayDayNumber,
  stayLengthDays,
  stayMonths,
  stayProgress,
} from './stay';

const date = (value: string) => value as LocalDate;

describe('stay', () => {
  it('dure 153 jours du 1er septembre 2026 au 31 janvier 2027', () => {
    expect(stayLengthDays(DEFAULT_STAY)).toBe(153);
  });

  it('numérote les jours comme les maquettes : le 20 septembre est le jour 20', () => {
    expect(stayDayNumber(DEFAULT_STAY, date('2026-09-20'))).toBe(20);
    expect(stayDayNumber(DEFAULT_STAY, date('2026-09-01'))).toBe(1);
    expect(stayDayNumber(DEFAULT_STAY, date('2027-01-31'))).toBe(153);
  });

  it('borne le numéro avant et après le séjour', () => {
    expect(stayDayNumber(DEFAULT_STAY, date('2026-08-15'))).toBe(0);
    expect(stayDayNumber(DEFAULT_STAY, date('2027-03-01'))).toBe(153);
  });

  it('20 jours sur 153 font 13 % du séjour', () => {
    expect(Math.round(stayProgress(DEFAULT_STAY, date('2026-09-20')) * 100)).toBe(13);
  });

  it('couvre cinq mois, de septembre à janvier', () => {
    expect(stayMonths(DEFAULT_STAY)).toEqual([
      '2026-09',
      '2026-10',
      '2026-11',
      '2026-12',
      '2027-01',
    ]);
  });

  describe('navigableMonths', () => {
    it('s’arrête au mois en cours (pas de futur)', () => {
      expect(navigableMonths(DEFAULT_STAY, date('2026-10-15'))).toEqual(['2026-09', '2026-10']);
    });

    it('n’offre que le premier mois avant le début du séjour', () => {
      expect(navigableMonths(DEFAULT_STAY, date('2026-08-15'))).toEqual(['2026-09']);
    });

    it('offre tous les mois après la fin du séjour', () => {
      expect(navigableMonths(DEFAULT_STAY, date('2027-03-01'))).toHaveLength(5);
    });

    it('le mois courant est le dernier de la liste', () => {
      const months = navigableMonths(DEFAULT_STAY, date('2026-09-21'));
      expect(months.at(-1)).toBe('2026-09' as YearMonth);
    });
  });
});
