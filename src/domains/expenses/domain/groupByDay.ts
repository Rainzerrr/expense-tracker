import { sumCents } from './money';
import type { Cents } from './money';
import type { LocalDate } from '@/shared/lib/time';

export interface DayGroup<T> {
  date: LocalDate;
  total: Cents;
  expenses: T[];
}

/** Regroupe par jour en gardant l'ordre d'arrivée (les dépenses arrivent déjà de la plus récente à la plus ancienne). */
export function groupByDay<T extends { date: LocalDate; amount: number }>(
  expenses: readonly T[],
): DayGroup<T>[] {
  const groups = new Map<LocalDate, T[]>();
  for (const expense of expenses) {
    const existing = groups.get(expense.date);
    if (existing) existing.push(expense);
    else groups.set(expense.date, [expense]);
  }
  return [...groups].map(([date, items]) => ({
    date,
    total: sumCents(items.map((item) => item.amount)),
    expenses: items,
  }));
}
