import { useLiveQuery } from 'dexie-react-hooks';
import { useAppServices } from '@/app/AppServices';
import { sumCents } from '@/domains/expenses';
import type { Stay } from '../domain/stay';

/** Total dépensé depuis le début du séjour. `undefined` tant que la base n'a pas répondu. */
export function useStayTotal(stay: Stay) {
  const { expenses } = useAppServices();
  return useLiveQuery(
    async () => sumCents((await expenses.findBetween(stay.start, stay.end)).map((e) => e.amount)),
    [expenses, stay.start, stay.end],
  );
}
