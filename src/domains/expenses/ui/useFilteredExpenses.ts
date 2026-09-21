import { useMemo } from 'react';
import type { Catalog } from '@/domains/categorization';
import { useCatalogLabels } from '@/domains/categorization/react';
import type { Expense } from '../domain/expense';
import { filterExpenses } from '../domain/filterExpenses';
import type { ExpenseFilters } from '../domain/filterExpenses';

/** « 12,40 » : le montant tel qu'on le tape, pour retrouver une dépense par son prix. */
const amountText = (cents: number) => (cents / 100).toFixed(2).replace('.', ',');

/**
 * Filtre l'historique. La recherche porte sur ce que l'utilisateur voit : libellés de catégorie
 * et de sous-catégorie (dans la langue de l'interface), tags avec leur « # », et montant.
 */
export function useFilteredExpenses(
  expenses: readonly Expense[] | undefined,
  catalog: Catalog | undefined,
  filters: ExpenseFilters,
) {
  const labels = useCatalogLabels();
  const { categoryId, tagId, query } = filters;

  return useMemo(() => {
    if (!expenses || !catalog) return undefined;
    return filterExpenses(expenses, { categoryId, tagId, query }, (expense) => {
      const category = catalog.categories.find((c) => c.id === expense.categoryId);
      const subcategory = catalog.subcategories.find((s) => s.id === expense.subcategoryId);
      const tags = expense.tagIds.flatMap((id) => {
        const tag = catalog.tags.find((t) => t.id === id);
        return tag ? [labels.tag(tag)] : [];
      });
      return [
        ...(category ? [labels.category(category)] : []),
        ...(subcategory ? [labels.subcategory(subcategory)] : []),
        ...tags,
        amountText(expense.amount),
      ];
    });
  }, [expenses, catalog, categoryId, tagId, query, labels]);
}
