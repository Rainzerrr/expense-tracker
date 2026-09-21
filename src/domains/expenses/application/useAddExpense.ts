import { useCallback } from 'react';
import { useAppServices } from '@/app/AppServices';
import { addExpense } from './addExpense';
import type { ExpenseInput } from '../domain/expense';

export function useAddExpense() {
  const { expenses, catalog } = useAppServices();
  return useCallback(
    (input: ExpenseInput) => addExpense({ expenses, catalog }, input),
    [expenses, catalog],
  );
}
