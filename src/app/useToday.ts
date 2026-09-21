import { useEffect, useState } from 'react';
import { todayInLisbon } from '@/shared/lib/time';
import { useAppServices } from './AppServices';

/** Le jour courant à Lisbonne, mis à jour quand l'application revient au premier plan (minuit passé). */
export function useToday() {
  const { now } = useAppServices();
  const [today, setToday] = useState(() => todayInLisbon(now()));

  useEffect(() => {
    const refresh = () => setToday(todayInLisbon(now()));
    document.addEventListener('visibilitychange', refresh);
    return () => document.removeEventListener('visibilitychange', refresh);
  }, [now]);

  return today;
}
