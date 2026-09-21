import { createSubcategoryLookup } from '@/domains/categorization';
import { nowInstant } from '@/shared/lib/time';
import { reviseExpense } from '../domain/expense';
import type { ExpenseId, ExpenseInput, ExpenseResult } from '../domain/expense';
import type { AddExpenseDeps } from './addExpense';

/** Modifie une dépense existante avec les mêmes règles qu'à la création. */
export async function updateExpense(
  { expenses, catalog }: AddExpenseDeps,
  id: ExpenseId,
  input: ExpenseInput,
  now: Date = new Date(),
): Promise<ExpenseResult> {
  const existing = await expenses.findById(id);
  if (!existing) return { ok: false, error: 'notFound' };

  const { subcategories } = await catalog.load();
  const result = reviseExpense(existing, input, {
    now: nowInstant(now),
    isSubcategoryOf: createSubcategoryLookup(subcategories),
  });
  if (result.ok) await expenses.update(result.expense);
  return result;
}
