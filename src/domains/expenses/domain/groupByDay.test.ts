import type { LocalDate } from '@/shared/lib/time';
import { groupByDay } from './groupByDay';

const spend = (date: string, amount: number) => ({ date: date as LocalDate, amount });

describe('groupByDay', () => {
  it('regroupe par jour avec le total du jour, dans l’ordre d’arrivée', () => {
    const groups = groupByDay([
      spend('2026-09-20', 1240),
      spend('2026-09-19', 1850),
      spend('2026-09-19', 620),
      spend('2026-09-13', 5500),
      spend('2026-09-13', 1520),
    ]);
    expect(groups.map((g) => [g.date, g.total, g.expenses.length])).toEqual([
      ['2026-09-20', 1240, 1],
      ['2026-09-19', 2470, 2], // 18,50 + 6,20 = 24,70 € comme dans la maquette
      ['2026-09-13', 7020, 2], // 55,00 + 15,20 = 70,20 €
    ]);
  });

  it('ne produit aucun groupe sans dépense', () => {
    expect(groupByDay([])).toEqual([]);
  });
});
