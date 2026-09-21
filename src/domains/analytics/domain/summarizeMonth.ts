import type { CategoryId } from '@/domains/categorization';
import type { LocalDate, YearMonth } from '@/shared/lib/time';
import { categoryBreakdown } from './categoryBreakdown';
import type { CategoryBreakdown } from './categoryBreakdown';
import { monthlyCumulative } from './monthlyCumulative';
import type { MonthlyCumulative } from './monthlyCumulative';
import { projectMonthEnd } from './projectMonthEnd';
import type { MonthProjection } from './projectMonthEnd';

export interface MonthSummary {
  month: YearMonth;
  projection: MonthProjection;
  breakdown: CategoryBreakdown;
  cumulative: MonthlyCumulative;
  expenseCount: number;
}

export interface SummarizeMonthInput {
  /** Dépenses non supprimées du mois. */
  expenses: readonly { amount: number; categoryId: CategoryId; date: LocalDate }[];
  month: YearMonth;
  today: LocalDate;
  fixedCategoryIds: readonly CategoryId[];
}

/** Tout ce que le dashboard affiche pour un mois, calculé d'un seul bloc et sans effet de bord. */
export function summarizeMonth(input: SummarizeMonthInput): MonthSummary {
  return {
    month: input.month,
    projection: projectMonthEnd(input),
    breakdown: categoryBreakdown(input.expenses),
    cumulative: monthlyCumulative(input),
    expenseCount: input.expenses.length,
  };
}
