import { useCallback } from 'react';
import { useAppServices } from '@/app/AppServices';
import { applyImport, createBackup, previewImport, recordExport } from './backupUseCases';
import type { BackupFile } from '../domain/backupFile';

export function useBackupActions() {
  const { backup, now } = useAppServices();
  return {
    createBackup: useCallback(() => createBackup(backup, now()), [backup, now]),
    recordExport: useCallback(() => recordExport(backup, now()), [backup, now]),
    previewImport: useCallback((text: string) => previewImport(backup, text), [backup]),
    applyImport: useCallback((file: BackupFile) => applyImport(backup, file, now()), [backup, now]),
    /** Toutes les données brutes (pour le CSV). */
    readData: useCallback(() => backup.readAll(), [backup]),
  };
}
