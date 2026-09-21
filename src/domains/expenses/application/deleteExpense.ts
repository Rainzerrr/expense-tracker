import { nowInstant } from '@/shared/lib/time';
import type { ExpenseId } from '../domain/expense';
import type { ExpenseRepository } from '../domain/ExpenseRepository';

/** Suppression logique : la dépense disparaît des écrans mais peut être restaurée (« Annuler »). */
export function deleteExpense(
  expenses: ExpenseRepository,
  id: ExpenseId,
  now: Date = new Date(),
): Promise<void> {
  return expenses.softDelete(id, nowInstant(now));
}

export function restoreExpense(
  expenses: ExpenseRepository,
  id: ExpenseId,
  now: Date = new Date(),
): Promise<void> {
  return expenses.restore(id, nowInstant(now));
}
