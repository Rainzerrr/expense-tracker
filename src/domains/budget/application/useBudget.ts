import { useLiveQuery } from 'dexie-react-hooks';
import { useCallback } from 'react';
import { useAppServices } from '@/app/AppServices';
import { nowInstant } from '@/shared/lib/time';
import type { Budget } from '../domain/budget';

/** Le budget courant, toujours à jour. `undefined` tant que la base n'a pas répondu. */
export function useBudget() {
  const { budget } = useAppServices();
  return useLiveQuery(() => budget.get(), [budget]);
}

export function useSetBudget() {
  const { budget, now } = useAppServices();
  return useCallback(
    (values: Omit<Budget, 'updatedAt'>) => budget.set({ ...values, updatedAt: nowInstant(now()) }),
    [budget, now],
  );
}
