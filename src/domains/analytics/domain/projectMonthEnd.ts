import type { CategoryId } from '@/domains/categorization';
import type { Cents } from '@/domains/expenses';
import { sumCents, toCents } from '@/domains/expenses';
import { daysBetween, monthEnd, monthStart } from '@/shared/lib/time';
import type { LocalDate, YearMonth } from '@/shared/lib/time';

export interface MonthProjection {
  /** Total dépensé dans le mois, dépenses fixes comprises. */
  spent: Cents;
  /** Total hors dépenses fixes (le loyer, payé le 1er, fausserait la moyenne). */
  variableSpent: Cents;
  /** Centimes par jour, hors dépenses fixes. Peut avoir des décimales : c'est une moyenne. */
  variableDailyAverage: number;
  /** Total prévu au dernier jour du mois, arrondi au centime. */
  projectedTotal: Cents;
  elapsedDays: number;
  remainingDays: number;
}

export interface ProjectMonthEndInput {
  /** Dépenses non supprimées du mois. */
  expenses: readonly { amount: number; categoryId: CategoryId }[];
  today: LocalDate;
  month: YearMonth;
  fixedCategoryIds: readonly CategoryId[];
}

/**
 * Projection = dépensé + moyenne quotidienne variable × jours restants.
 * Un mois passé est projeté à son total réel, un mois futur à zéro.
 */
export function projectMonthEnd(input: ProjectMonthEndInput): MonthProjection {
  const start = monthStart(input.month);
  const end = monthEnd(input.month);
  // On borne « aujourd'hui » au mois affiché.
  const day = input.today < start ? start : input.today > end ? end : input.today;

  const spent = sumCents(input.expenses.map((e) => e.amount));
  const variableSpent = sumCents(
    input.expenses
      .filter((e) => !input.fixedCategoryIds.includes(e.categoryId))
      .map((e) => e.amount),
  );
  const elapsedDays = daysBetween(start, day) + 1;
  const remainingDays = daysBetween(day, end);
  const variableDailyAverage = variableSpent / elapsedDays;

  return {
    spent,
    variableSpent,
    variableDailyAverage,
    projectedTotal: toCents(Math.round(spent + variableDailyAverage * remainingDays)),
    elapsedDays,
    remainingDays,
  };
}
