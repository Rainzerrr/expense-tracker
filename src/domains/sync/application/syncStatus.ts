import { create } from 'zustand';
import type { BackupRepository, MergeSummary } from '@/domains/backup';
import { SyncError } from '../domain/SyncServer';
import type { SyncFailure, SyncServer } from '../domain/SyncServer';
import type { SyncCode } from '../domain/syncCode';
import type { SyncOutcome } from './syncNow';

export type SyncState =
  | { kind: 'idle' }
  | { kind: 'syncing' }
  | { kind: 'done'; outcome: SyncOutcome }
  | { kind: 'failed'; reason: SyncFailure | 'unknown' };

/**
 * État de la synchronisation, partagé entre les déclencheurs automatiques et Réglages.
 * `lastReceived` : la dernière synchronisation qui a apporté du nouveau. Gardée à part, sinon la
 * synchronisation suivante (souvent immédiate, « rien de neuf ») effacerait le message.
 */
export const useSyncState = create<{ state: SyncState; lastReceived: MergeSummary | null }>(() => ({
  state: { kind: 'idle' },
  lastReceived: null,
}));

export interface RunSyncDeps {
  backup: BackupRepository;
  server: SyncServer;
  code: SyncCode;
  now: () => Date;
}

// Aucun import de valeur depuis `@/domains/backup` ici : son index embarque Zod (~23 Ko gzip),
// et ce module est chargé au démarrage. La fusion vit dans `syncNow.ts`, chargé à la demande.

let running: Promise<SyncState> | null = null;
let again = false;

/**
 * Lance une synchronisation. Jamais deux à la fois : une demande pendant qu'une autre tourne est
 * regroupée en une seule synchronisation de plus, juste après (pour ne rien rater de ce qui a
 * changé entre-temps). Ne lève jamais d'erreur : le résultat est dans `useSyncState`.
 */
export function runSync(deps: RunSyncDeps): Promise<SyncState> {
  if (running) {
    again = true;
    return running;
  }
  running = (async () => {
    let state: SyncState;
    do {
      again = false;
      useSyncState.setState({ state: { kind: 'syncing' } });
      state = await attempt(deps);
      const received = state.kind === 'done' ? state.outcome.received : null;
      useSyncState.setState(received ? { state, lastReceived: received } : { state });
    } while (again && state.kind === 'done');
    running = null;
    return state;
  })();
  return running;
}

async function attempt(deps: RunSyncDeps): Promise<SyncState> {
  try {
    // Chargé à la première synchronisation seulement (Zod, fusion) : rien de plus au démarrage.
    const { syncNow } = await import('./syncNow');
    const outcome = await syncNow({ ...deps, now: deps.now() });
    return { kind: 'done', outcome };
  } catch (error) {
    if (error instanceof SyncError) return { kind: 'failed', reason: error.reason };
    console.error(error);
    return { kind: 'failed', reason: 'unknown' };
  }
}
