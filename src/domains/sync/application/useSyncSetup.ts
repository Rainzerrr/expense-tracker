import { useCallback } from 'react';
import { useAppServices } from '@/app/AppServices';
import { SyncError } from '../domain/SyncServer';
import type { SyncFailure } from '../domain/SyncServer';
import { generateSyncCode, parseSyncCode } from '../domain/syncCode';
import { runSync, useSyncState } from './syncStatus';

export type JoinResult =
  { ok: true } | { ok: false; reason: 'invalidCode' | 'unknownCode' | SyncFailure };

/** Relier cet appareil à un coffre (nouveau ou existant), ou l'en détacher. */
export function useSyncSetup() {
  const { syncSettings, syncServer, backup, now } = useAppServices();

  /** Premier appareil : un nouveau code, et tout ce qui est ici part en ligne. */
  const create = useCallback(async () => {
    const code = generateSyncCode();
    await syncSettings.setCode(code);
    await runSync({ backup, server: syncServer, code, now });
  }, [syncSettings, syncServer, backup, now]);

  /**
   * Appareil suivant : le code doit désigner un coffre qui existe déjà. Un code mal recopié
   * créerait sinon en silence un coffre vide, et les deux appareils ne se verraient jamais.
   */
  const join = useCallback(
    async (input: string): Promise<JoinResult> => {
      const code = parseSyncCode(input);
      if (!code) return { ok: false, reason: 'invalidCode' };
      try {
        const remote = await syncServer.pull(code);
        if (remote.rev === 0) return { ok: false, reason: 'unknownCode' };
      } catch (error) {
        if (error instanceof SyncError) return { ok: false, reason: error.reason };
        throw error;
      }
      await syncSettings.setCode(code);
      await runSync({ backup, server: syncServer, code, now });
      return { ok: true };
    },
    [syncSettings, syncServer, backup, now],
  );

  /** Les données restent sur l'appareil ; il ne reçoit simplement plus rien. */
  const unlink = useCallback(async () => {
    await syncSettings.clearCode();
    useSyncState.setState({ state: { kind: 'idle' }, lastReceived: null });
  }, [syncSettings]);

  return { create, join, unlink };
}
