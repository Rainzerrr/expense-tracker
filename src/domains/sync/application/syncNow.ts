import {
  createBackupFile,
  hasChanges,
  mergeBackup,
  parseBackup,
  serializeBackup,
} from '@/domains/backup';
import type { BackupData, BackupRepository, MergeSummary } from '@/domains/backup';
import { nowInstant } from '@/shared/lib/time';
import type { IsoInstant } from '@/shared/lib/time';
import { SyncError } from '../domain/SyncServer';
import type { SyncServer } from '../domain/SyncServer';
import type { SyncCode } from '../domain/syncCode';

// Chargé à la demande (voir `syncStatus.ts`) : il embarque Zod, inutile au démarrage.

export interface SyncOutcome {
  /** Ce que l'autre appareil a apporté ici (null si rien de nouveau). */
  received: MergeSummary | null;
  /** Vrai si cet appareil avait du nouveau à envoyer. */
  pushed: boolean;
}

export interface SyncDeps {
  backup: BackupRepository;
  server: SyncServer;
  code: SyncCode;
  now: Date;
}

/** Un autre appareil peut écrire entre notre lecture et notre envoi : on recommence, un peu. */
const MAX_ATTEMPTS = 3;

const isEmpty = (data: BackupData) =>
  data.budget === null &&
  data.expenses.length +
    data.categories.length +
    data.subcategories.length +
    data.tags.length +
    data.focuses.length +
    data.merchantRules.length ===
    0;

/** Modification la plus récente des données (le catalogue par défaut porte la date d'époque). */
function latestUpdate(data: BackupData): IsoInstant | null {
  const instants = [
    ...data.expenses,
    ...data.categories,
    ...data.subcategories,
    ...data.tags,
    ...data.focuses,
    ...data.merchantRules,
    ...(data.budget ? [data.budget] : []),
  ].map((record) => record.updatedAt);
  return instants.length === 0 ? null : instants.reduce((a, b) => (b > a ? b : a));
}

/**
 * Synchronise cet appareil avec le coffre en ligne :
 * 1. récupère le fichier en ligne et le fusionne ici (la version la plus récente gagne, comme
 *    l'import d'un fichier : rien n'est jamais perdu) ;
 * 2. si cet appareil a du nouveau, envoie l'état fusionné, à condition que personne n'ait écrit
 *    entre-temps (sinon on recommence à l'étape 1).
 */
export async function syncNow({ backup, server, code, now }: SyncDeps): Promise<SyncOutcome> {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const remote = await server.pull(code);

    let remoteData: BackupData | null = null;
    let received: MergeSummary | null = null;
    if (remote.text !== null) {
      const parsed = parseBackup(remote.text);
      if (!parsed.ok) {
        throw new SyncError(parsed.error === 'newerVersion' ? 'newerVersion' : 'invalidRemote');
      }
      remoteData = parsed.file.data;
      const plan = mergeBackup(await backup.readAll(), remoteData);
      if (!isEmpty(plan.toWrite)) await backup.writeAll(plan.toWrite);
      if (hasChanges(plan.summary)) received = plan.summary;
    }

    // Le coffre a-t-il besoin de ce qu'on a ici ? Même question que l'import, dans l'autre sens.
    const local = await backup.readAll();
    const pushed = remoteData === null || !isEmpty(mergeBackup(remoteData, local).toWrite);
    if (pushed) {
      const text = serializeBackup(createBackupFile(local, now));
      const result = await server.push(code, remote.rev, text);
      if (!result.ok) continue;
    }

    await backup.setMeta('lastSyncAt', nowInstant(now));
    const through = latestUpdate(local);
    if (through) await backup.setMeta('syncedThrough', through);
    return { received, pushed };
  }
  throw new SyncError('conflict');
}
