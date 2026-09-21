import { buildDemoExpenses } from '@/domains/expenses';
import { FIXED_CATEGORY_IDS } from '@/domains/categorization';
import type { IsoInstant, LocalDate, YearMonth } from '@/shared/lib/time';
import { summarizeMonth } from './summarizeMonth';

// Le jeu de démo est calé sur les maquettes : le résumé doit retrouver leurs chiffres.
describe('summarizeMonth (jeu de démo au 20 septembre)', () => {
  const today = '2026-09-20' as LocalDate;
  let n = 0;
  const expenses = buildDemoExpenses(
    today,
    '2026-09-20T10:00:00.000Z' as IsoInstant,
    () => `id-${n++}`,
  );
  const summary = summarizeMonth({
    expenses,
    month: '2026-09' as YearMonth,
    today,
    fixedCategoryIds: FIXED_CATEGORY_IDS,
  });

  it('retrouve 970 € dépensés, 27,50 € par jour, 1 245 € en fin de mois', () => {
    expect(summary.projection).toMatchObject({
      spent: 97000,
      variableDailyAverage: 2750,
      projectedTotal: 124500,
      remainingDays: 10,
    });
  });

  it('range le logement en tête de la répartition', () => {
    expect(summary.breakdown.slices[0]).toMatchObject({ categoryId: 'housing', amount: 42000 });
    expect(summary.breakdown.total).toBe(97000);
  });

  it('retrouve 550 € cumulés hors logement, ≈ 825 € en fin de mois', () => {
    expect(summary.cumulative.actual.at(-1)?.amount).toBe(55000);
    expect(summary.cumulative.projection.at(-1)?.amount).toBe(82500);
  });

  it('compte les dépenses', () => {
    expect(summary.expenseCount).toBe(expenses.length);
  });
});
