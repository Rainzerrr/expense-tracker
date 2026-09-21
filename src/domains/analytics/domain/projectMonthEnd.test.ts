import { FIXED_CATEGORY_IDS, categoryIdFor } from '@/domains/categorization';
import type { LocalDate, YearMonth } from '@/shared/lib/time';
import { projectMonthEnd } from './projectMonthEnd';

const housing = categoryIdFor('housing');
const groceries = categoryIdFor('groceries');
const month = '2026-09' as YearMonth;

const project = (today: string, expenses: { amount: number; categoryId: typeof housing }[]) =>
  projectMonthEnd({
    expenses,
    today: today as LocalDate,
    month,
    fixedCategoryIds: FIXED_CATEGORY_IDS,
  });

describe('projectMonthEnd', () => {
  it('cas de référence des maquettes : jour 20 sur 30, 970 € dont 420 € de loyer → 1 245 €', () => {
    const result = project('2026-09-20', [
      { amount: 42000, categoryId: housing },
      { amount: 55000, categoryId: groceries },
    ]);
    expect(result).toEqual({
      spent: 97000,
      variableSpent: 55000,
      variableDailyAverage: 2750, // 27,50 € par jour
      projectedTotal: 124500, // 970 + 27,50 × 10
      elapsedDays: 20,
      remainingDays: 10,
    });
  });

  it('septembre a 30 jours : il reste 10 jours au 20, pas 11', () => {
    expect(project('2026-09-20', []).remainingDays).toBe(10);
  });

  it('le dernier jour du mois, la projection égale le total', () => {
    const result = project('2026-09-30', [{ amount: 12345, categoryId: groceries }]);
    expect(result.remainingDays).toBe(0);
    expect(result.projectedTotal).toBe(12345);
  });

  it('le premier jour, le loyer seul ne gonfle pas la projection', () => {
    const result = project('2026-09-01', [{ amount: 42000, categoryId: housing }]);
    expect(result.variableDailyAverage).toBe(0);
    expect(result.projectedTotal).toBe(42000);
  });

  it('arrondit la projection au centime', () => {
    // 1000 centimes en 3 jours = 333,33…/jour ; 27 jours restants → 1000 + 9000 = 10000
    const result = project('2026-09-03', [{ amount: 1000, categoryId: groceries }]);
    expect(Number.isInteger(result.projectedTotal)).toBe(true);
    expect(result.projectedTotal).toBe(10000);
  });

  it('un mois passé est projeté à son total réel', () => {
    const result = project('2026-10-15', [{ amount: 50000, categoryId: groceries }]);
    expect(result.remainingDays).toBe(0);
    expect(result.projectedTotal).toBe(50000);
  });

  it('un mois futur reste à zéro et ne divise pas par zéro', () => {
    const result = project('2026-08-15', []);
    expect(result.elapsedDays).toBe(1);
    expect(result.projectedTotal).toBe(0);
  });
});
