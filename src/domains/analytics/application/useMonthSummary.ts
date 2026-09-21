import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo } from 'react';
import { useAppServices } from '@/app/AppServices';
import { FIXED_CATEGORY_IDS } from '@/domains/categorization';
import type { LocalDate, YearMonth } from '@/shared/lib/time';
import { summarizeMonth } from '../domain/summarizeMonth';

/** Dépenses du mois et leur résumé. `undefined` tant que la base n'a pas répondu. */
export function useMonthSummary(month: YearMonth, today: LocalDate) {
  const { expenses } = useAppServices();
  const monthExpenses = useLiveQuery(() => expenses.findByMonth(month), [expenses, month]);

  const summary = useMemo(
    () =>
      monthExpenses &&
      summarizeMonth({
        expenses: monthExpenses,
        month,
        today,
        fixedCategoryIds: FIXED_CATEGORY_IDS,
      }),
    [monthExpenses, month, today],
  );

  return { expenses: monthExpenses, summary };
}
