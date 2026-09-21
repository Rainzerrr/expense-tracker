import type { IsoInstant } from '@/shared/lib/time';
import type { BackupStatus } from '../domain/backupReminder';
import type { BackupRepository } from '../domain/BackupRepository';

export async function getBackupStatus(repository: BackupRepository): Promise<BackupStatus> {
  const [lastExportAt, lastImportAt] = await Promise.all([
    repository.getMeta('lastExportAt'),
    repository.getMeta('lastImportAt'),
  ]);
  // Ce qui a été exporté ou importé est « à l'abri » : on ne compte que les modifications d'après.
  const since =
    [lastExportAt, lastImportAt]
      .filter((value): value is IsoInstant => value !== null)
      .sort()
      .at(-1) ?? null;
  return {
    lastExportAt,
    lastImportAt,
    oldestUnsavedChange: await repository.oldestChangeSince(since),
  };
}
