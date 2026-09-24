import type { Category, Subcategory, Tag } from '@/domains/categorization';
import type { Expense } from '@/domains/expenses';
import type { Focus } from '@/domains/focus';
import type { Budget } from '@/domains/budget';
import type { MerchantRule } from '@/domains/statements';
import { nowInstant } from '@/shared/lib/time';
import type { IsoInstant } from '@/shared/lib/time';

export const BACKUP_FORMAT = 'lisboa-expenses';
/** À incrémenter quand le format change de façon incompatible. Un fichier plus récent est refusé. */
export const BACKUP_VERSION = 1;

/** Toutes les données de l'utilisateur, suppressions logiques comprises (elles voyagent aussi). */
export interface BackupData {
  expenses: Expense[];
  categories: Category[];
  subcategories: Subcategory[];
  tags: Tag[];
  /** Absents des fichiers créés avant l'existence des focus : lus comme une liste vide. */
  focuses: Focus[];
  /** Idem : règles « commerçant → catégorie » apprises. */
  merchantRules: MerchantRule[];
  /** Absent : le budget par défaut sera utilisé. */
  budget: Budget | null;
}

export interface BackupFile {
  format: typeof BACKUP_FORMAT;
  version: number;
  exportedAt: IsoInstant;
  data: BackupData;
}

export type BackupError = 'notJson' | 'notABackup' | 'newerVersion' | 'invalid';
export type ParseBackupResult = { ok: true; file: BackupFile } | { ok: false; error: BackupError };

export const emptyBackupData = (): BackupData => ({
  expenses: [],
  categories: [],
  subcategories: [],
  tags: [],
  focuses: [],
  merchantRules: [],
  budget: null,
});

export function createBackupFile(data: BackupData, now: Date = new Date()): BackupFile {
  return { format: BACKUP_FORMAT, version: BACKUP_VERSION, exportedAt: nowInstant(now), data };
}

export function serializeBackup(file: BackupFile): string {
  return JSON.stringify(file);
}

/** « lisboa-2026-09-21.json » : la date du jour dans le nom, pour retrouver la plus récente. */
export function backupFileName(now: Date): string {
  return `lisboa-${nowInstant(now).slice(0, 10)}.json`;
}
