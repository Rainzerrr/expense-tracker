import type { CategoryId } from '@/domains/categorization';
import { daysBetween, daysInMonth, monthEnd, monthStart } from '@/shared/lib/time';
import type { LocalDate, YearMonth } from '@/shared/lib/time';

export interface CumulativePoint {
  /** Jour du mois, de 1 à 31. */
  day: number;
  /** Centimes cumulés (peut avoir des décimales pour la projection). */
  amount: number;
}

export interface MonthlyCumulative {
  daysInMonth: number;
  /** Cumul réel jour par jour, jusqu'à aujourd'hui. Vide pour un mois futur. */
  actual: CumulativePoint[];
  /** Droite de aujourd'hui à la fin du mois. Vide si le mois est fini ou n'a pas commencé. */
  projection: CumulativePoint[];
}

export interface MonthlyCumulativeInput {
  expenses: readonly { amount: number; categoryId: CategoryId; date: LocalDate }[];
  month: YearMonth;
  today: LocalDate;
  fixedCategoryIds: readonly CategoryId[];
}

/**
 * Cumul des dépenses variables (hors logement) jour après jour, prolongé jusqu'à la fin du mois
 * au rythme moyen observé. C'est la courbe « Rythme du mois » du dashboard.
 */
export function monthlyCumulative(input: MonthlyCumulativeInput): MonthlyCumulative {
  const totalDays = daysInMonth(input.month);
  const start = monthStart(input.month);
  const end = monthEnd(input.month);

  const dailyVariable = new Array<number>(totalDays).fill(0);
  for (const expense of input.expenses) {
    if (input.fixedCategoryIds.includes(expense.categoryId)) continue;
    const dayIndex = daysBetween(start, expense.date);
    if (dayIndex >= 0 && dayIndex < totalDays) dailyVariable[dayIndex]! += expense.amount;
  }

  // Dernier jour à tracer : aujourd'hui, borné au mois affiché.
  const lastDay =
    input.today < start ? 0 : input.today > end ? totalDays : daysBetween(start, input.today) + 1;

  const actual: CumulativePoint[] = [];
  let running = 0;
  for (let day = 1; day <= lastDay; day += 1) {
    running += dailyVariable[day - 1] ?? 0;
    actual.push({ day, amount: running });
  }

  if (lastDay < 1 || lastDay >= totalDays)
    return { daysInMonth: totalDays, actual, projection: [] };

  const dailyAverage = running / lastDay;
  return {
    daysInMonth: totalDays,
    actual,
    projection: [
      { day: lastDay, amount: running },
      { day: totalDays, amount: running + dailyAverage * (totalDays - lastDay) },
    ],
  };
}
