import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { isYearMonth, monthOf } from '@/shared/lib/time';
import type { LocalDate, YearMonth } from '@/shared/lib/time';
import { navigableMonths } from '../domain/stay';
import type { Stay } from '../domain/stay';

const MONTH_PARAM = 'month';

/**
 * Mois affiché, mémorisé dans l'adresse (`?month=2026-09`) : le bouton retour et le partage
 * fonctionnent. Une valeur absente ou hors séjour retombe sur le mois en cours.
 */
export function useSelectedMonth(stay: Stay, today: LocalDate) {
  const [params, setParams] = useSearchParams();
  const months = navigableMonths(stay, today);
  const fallback = months.at(-1) ?? monthOf(today);

  const requested = params.get(MONTH_PARAM);
  const month: YearMonth =
    requested && isYearMonth(requested) && months.includes(requested) ? requested : fallback;

  const index = months.indexOf(month);
  const previous = index > 0 ? months[index - 1] : undefined;
  const next = index < months.length - 1 ? months[index + 1] : undefined;

  const select = useCallback(
    (target: YearMonth) =>
      setParams(
        (current) => {
          const updated = new URLSearchParams(current);
          if (target === fallback) updated.delete(MONTH_PARAM);
          else updated.set(MONTH_PARAM, target);
          return updated;
        },
        { replace: true },
      ),
    [fallback, setParams],
  );

  return { month, previous, next, select };
}
