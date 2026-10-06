import type { SyncCode } from './syncCode';

/** Ce que le serveur garde pour un code : le dernier fichier de sauvegarde et sa révision. */
export interface RemoteSnapshot {
  /** 0 tant que personne n'a rien envoyé. */
  rev: number;
  text: string | null;
}

export type PushResult = { ok: true; rev: number } | { ok: false; reason: 'conflict' };

export type SyncFailure =
  | 'offline'
  | 'unavailable'
  | 'unauthorized'
  | 'tooManyRequests'
  | 'invalidRemote'
  | 'newerVersion'
  | 'conflict';

/** Erreur attendue (réseau, serveur, données en ligne), avec sa raison à afficher. */
export class SyncError extends Error {
  constructor(readonly reason: SyncFailure) {
    super(`Synchronisation impossible : ${reason}`);
    this.name = 'SyncError';
  }
}

/** Port vers le serveur de synchronisation (`/api/sync`). */
export interface SyncServer {
  pull(code: SyncCode): Promise<RemoteSnapshot>;
  /** N'écrit que si la révision en ligne est toujours `baseRev`, sinon `conflict`. */
  push(code: SyncCode, baseRev: number, text: string): Promise<PushResult>;
}
