import { useCallback } from 'react';
import { useAppServices } from '@/app/AppServices';
import type { ExpenseId, ExpenseInput } from '../domain/expense';
import { deleteExpense, restoreExpense } from './deleteExpense';
import { updateExpense } from './updateExpense';

export function useUpdateExpense() {
  const { expenses, catalog, now } = useAppServices();
  return useCallback(
    (id: ExpenseId, input: ExpenseInput) => updateExpense({ expenses, catalog }, id, input, now()),
    [expenses, catalog, now],
  );
}

export function useDeleteExpense() {
  const { expenses, now } = useAppServices();
  return useCallback((id: ExpenseId) => deleteExpense(expenses, id, now()), [expenses, now]);
}

export function useRestoreExpense() {
  const { expenses, now } = useAppServices();
  return useCallback((id: ExpenseId) => restoreExpense(expenses, id, now()), [expenses, now]);
}
