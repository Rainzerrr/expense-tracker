import { nowInstant } from '@/shared/lib/time';
import { backupFileName, createBackupFile, serializeBackup } from '../domain/backupFile';
import type { BackupError, BackupFile } from '../domain/backupFile';
import type { BackupRepository } from '../domain/BackupRepository';
import { mergeBackup } from '../domain/mergeBackup';
import type { MergePlan, MergeSummary } from '../domain/mergeBackup';

export interface CreatedBackup {
  fileName: string;
  text: string;
  expenseCount: number;
}

/** Prépare le fichier à envoyer ou à télécharger. Ne note pas encore l'export : voir `recordExport`. */
export async function createBackup(
  repository: BackupRepository,
  now: Date = new Date(),
): Promise<CreatedBackup> {
  const data = await repository.readAll();
  const file = createBackupFile(data, now);
  return {
    fileName: backupFileName(now),
    text: serializeBackup(file),
    expenseCount: data.expenses.filter((expense) => expense.deletedAt === null).length,
  };
}

/** À appeler quand le fichier est réellement parti (partage abouti, téléchargement lancé). */
export function recordExport(repository: BackupRepository, now: Date = new Date()): Promise<void> {
  return repository.setMeta('lastExportAt', nowInstant(now));
}

export type ImportPreview =
  { ok: true; file: BackupFile; plan: MergePlan } | { ok: false; error: BackupError };

/** Lit le fichier et calcule ce que l'import changerait, sans rien écrire. */
export async function previewImport(
  repository: BackupRepository,
  text: string,
): Promise<ImportPreview> {
  // Zod (validation) n'est chargé qu'ici, quand l'utilisateur choisit vraiment un fichier.
  const { parseBackup } = await import('../domain/parseBackup');
  const parsed = parseBackup(text);
  if (!parsed.ok) return parsed;
  const plan = mergeBackup(await repository.readAll(), parsed.file.data);
  return { ok: true, file: parsed.file, plan };
}

/**
 * Applique l'import. La fusion est recalculée sur l'état actuel de la base : si des données ont
 * changé entre l'aperçu et la confirmation, rien n'est écrasé à tort.
 */
export async function applyImport(
  repository: BackupRepository,
  file: BackupFile,
  now: Date = new Date(),
): Promise<MergeSummary> {
  const plan = mergeBackup(await repository.readAll(), file.data);
  await repository.writeAll(plan.toWrite);
  await repository.setMeta('lastImportAt', nowInstant(now));
  return plan.summary;
}
