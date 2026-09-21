import type { CategoryId } from '@/domains/categorization';
import { FIXED_CATEGORY_IDS } from '@/domains/categorization';
import type { LocalDate, YearMonth } from '@/shared/lib/time';
import { monthlyCumulative } from './monthlyCumulative';

const month = '2026-09' as YearMonth;
const spend = (date: string, amount: number, categoryId = 'groceries') => ({
  date: date as LocalDate,
  amount,
  categoryId: categoryId as CategoryId,
});
const run = (today: string, expenses: ReturnType<typeof spend>[]) =>
  monthlyCumulative({
    expenses,
    month,
    today: today as LocalDate,
    fixedCategoryIds: FIXED_CATEGORY_IDS,
  });

describe('monthlyCumulative', () => {
  it('cumule jour après jour, en ignorant le logement', () => {
    const result = run('2026-09-04', [
      spend('2026-09-01', 42000, 'housing'),
      spend('2026-09-01', 1000),
      spend('2026-09-03', 500),
      spend('2026-09-03', 250),
    ]);
    expect(result.actual.map((p) => p.amount)).toEqual([1000, 1000, 1750, 1750]);
    expect(result.actual.map((p) => p.day)).toEqual([1, 2, 3, 4]);
  });

  it('cas de référence des maquettes : 550 € au jour 20, ≈ 825 € projetés au jour 30', () => {
    const result = run('2026-09-20', [
      spend('2026-09-01', 42000, 'housing'),
      spend('2026-09-10', 30000),
      spend('2026-09-20', 25000),
    ]);
    expect(result.actual.at(-1)).toEqual({ day: 20, amount: 55000 });
    expect(result.projection).toEqual([
      { day: 20, amount: 55000 },
      { day: 30, amount: 82500 },
    ]);
  });

  it('un mois passé est tracé en entier, sans projection', () => {
    const result = run('2026-10-15', [spend('2026-09-30', 700)]);
    expect(result.actual).toHaveLength(30);
    expect(result.actual.at(-1)?.amount).toBe(700);
    expect(result.projection).toEqual([]);
  });

  it('un mois futur est vide', () => {
    const result = run('2026-08-15', []);
    expect(result.actual).toEqual([]);
    expect(result.projection).toEqual([]);
  });

  it('le dernier jour du mois, la projection disparaît', () => {
    expect(run('2026-09-30', []).projection).toEqual([]);
  });

  it('ignore les dépenses d’un autre mois', () => {
    const result = run('2026-09-05', [spend('2026-08-31', 999), spend('2026-10-01', 999)]);
    expect(result.actual.at(-1)?.amount).toBe(0);
  });

  it('un mois sans dépense reste à zéro', () => {
    const result = run('2026-09-10', []);
    expect(result.projection.at(-1)).toEqual({ day: 30, amount: 0 });
  });
});
