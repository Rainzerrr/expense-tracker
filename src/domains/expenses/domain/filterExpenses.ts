import type { CategoryId, TagId } from '@/domains/categorization';
import type { Expense } from './expense';
import { matchesQuery } from './search';

export interface ExpenseFilters {
  categoryId?: CategoryId | null;
  tagId?: TagId | null;
  query?: string;
}

/**
 * Filtre l'historique. Les champs de recherche (libellés traduits, tags, montant) sont fournis
 * par l'appelant : le domaine ne connaît pas la langue de l'interface.
 */
export function filterExpenses<T extends Pick<Expense, 'categoryId' | 'tagIds'>>(
  expenses: readonly T[],
  filters: ExpenseFilters,
  searchFields: (expense: T) => readonly string[],
): T[] {
  const { categoryId, tagId, query = '' } = filters;
  return expenses.filter(
    (expense) =>
      (!categoryId || expense.categoryId === categoryId) &&
      (!tagId || expense.tagIds.includes(tagId)) &&
      matchesQuery(searchFields(expense), query),
  );
}
