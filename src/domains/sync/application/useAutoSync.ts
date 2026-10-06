import { useLiveQuery } from 'dexie-react-hooks';
import { useCallback, useEffect } from 'react';
import { useAppServices } from '@/app/AppServices';
import { runSync } from './syncStatus';

/** Délai après une saisie : plusieurs modifications rapprochées partent ensemble. */
export const SYNC_DEBOUNCE_MS = 3000;

/** Le code de cet appareil, ou null s'il n'est pas relié (toujours null en mode démo). */
export function useSyncCode() {
  const { syncSettings, isDemo } = useAppServices();
  return useLiveQuery(
    async () => (isDemo ? null : await syncSettings.getCode()),
    [syncSettings, isDemo],
  );
}

/** Synchronise maintenant avec le code de cet appareil (rien s'il n'est pas relié). */
export function useRunSync() {
  const { syncSettings, backup, syncServer, now, isDemo } = useAppServices();
  return useCallback(async () => {
    const code = isDemo ? null : await syncSettings.getCode();
    if (code) await runSync({ backup, server: syncServer, code, now });
  }, [syncSettings, backup, syncServer, now, isDemo]);
}

/**
 * Déclencheurs automatiques (guide 10.2) : au démarrage, au retour au premier plan, au retour du
 * réseau, et quelques secondes après chaque modification locale. Monté une fois, dans `RootLayout`.
 */
export function useAutoSync() {
  const { backup } = useAppServices();
  const code = useSyncCode();
  const sync = useRunSync();

  // Plus ancienne modification que le serveur n'a pas reçue. Une date plutôt qu'un booléen : une
  // saisie faite pendant une synchronisation change la valeur, donc relance le délai ci-dessous.
  const pending = useLiveQuery(
    async () =>
      code ? await backup.oldestChangeSince(await backup.getMeta('syncedThrough')) : null,
    [code, backup],
  );

  useEffect(() => {
    if (!code) return;
    void sync();
    const onVisible = () => {
      if (document.visibilityState === 'visible') void sync();
    };
    const onOnline = () => void sync();
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('online', onOnline);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('online', onOnline);
    };
  }, [code, sync]);

  useEffect(() => {
    if (!code || !pending) return;
    const timer = setTimeout(() => void sync(), SYNC_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [code, pending, sync]);
}
