import type { IsoInstant } from '@/shared/lib/time';
import type { BackupStatus } from '../domain/backupReminder';
import type { BackupRepository } from '../domain/BackupRepository';

export async function getBackupStatus(repository: BackupRepository): Promise<BackupStatus> {
  const [lastExportAt, lastImportAt, syncedThrough] = await Promise.all([
    repository.getMeta('lastExportAt'),
    repository.getMeta('lastImportAt'),
    repository.getMeta('syncedThrough'),
  ]);
  // Ce qui a été exporté, importé ou reçu par le serveur de synchronisation est « à l'abri » :
  // on ne compte que les modifications d'après.
  const since =
    [lastExportAt, lastImportAt, syncedThrough]
      .filter((value): value is IsoInstant => value !== null)
      .sort()
      .at(-1) ?? null;
  return {
    lastExportAt,
    lastImportAt,
    oldestUnsavedChange: await repository.oldestChangeSince(since),
  };
}
