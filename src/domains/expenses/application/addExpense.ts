import { createSubcategoryLookup } from '@/domains/categorization';
import type { CatalogRepository } from '@/domains/categorization';
import { newId } from '@/shared/lib/ids';
import { nowInstant } from '@/shared/lib/time';
import { createExpense } from '../domain/expense';
import type { ExpenseId, ExpenseInput, ExpenseResult } from '../domain/expense';
import type { ExpenseRepository } from '../domain/ExpenseRepository';

export interface AddExpenseDeps {
  expenses: ExpenseRepository;
  catalog: CatalogRepository;
}

/** Valide puis enregistre. Rien n'est écrit si une règle du domaine est violée. */
export async function addExpense(
  { expenses, catalog }: AddExpenseDeps,
  input: ExpenseInput,
  now: Date = new Date(),
): Promise<ExpenseResult> {
  const { subcategories } = await catalog.load();
  const result = createExpense(input, {
    id: newId() as ExpenseId,
    now: nowInstant(now),
    isSubcategoryOf: createSubcategoryLookup(subcategories),
  });
  if (result.ok) await expenses.add(result.expense);
  return result;
}
