import type { IsoInstant } from '@/shared/lib/time';
import type { BackupData } from './backupFile';

/** Clés des petits réglages techniques. */
export type BackupMetaKey = 'lastExportAt' | 'lastImportAt';

export interface BackupRepository {
  /** Toutes les données, suppressions logiques comprises. */
  readAll(): Promise<BackupData>;
  /** Écrit tout ou rien : une erreur en cours de route ne laisse pas la base à moitié fusionnée. */
  writeAll(data: BackupData): Promise<void>;
  getMeta(key: BackupMetaKey): Promise<IsoInstant | null>;
  setMeta(key: BackupMetaKey, value: IsoInstant): Promise<void>;
  /** Plus ancienne modification strictement postérieure à `since` (ou à l'origine si null). */
  oldestChangeSince(since: IsoInstant | null): Promise<IsoInstant | null>;
}
