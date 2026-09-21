import { useLiveQuery } from 'dexie-react-hooks';
import { useAppServices } from '@/app/AppServices';
import type { YearMonth } from '@/shared/lib/time';
import type { ExpenseId } from '../domain/expense';

/** Dépenses du mois, toujours à jour. `undefined` tant que la base n'a pas répondu. */
export function useMonthExpenses(month: YearMonth) {
  const { expenses } = useAppServices();
  return useLiveQuery(() => expenses.findByMonth(month), [expenses, month]);
}

/**
 * Une dépense par identifiant. `undefined` : chargement en cours. `null` : elle n'existe pas
 * (ou vient d'être supprimée), ce qui permet de fermer proprement un panneau de modification.
 */
export function useExpense(id: ExpenseId) {
  const { expenses } = useAppServices();
  return useLiveQuery(async () => (await expenses.findById(id)) ?? null, [expenses, id]);
}
