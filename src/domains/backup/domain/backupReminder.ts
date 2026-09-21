import { differenceInCalendarDays, parseISO } from 'date-fns';
import type { IsoInstant } from '@/shared/lib/time';

export const REMINDER_AFTER_DAYS = 7;

export interface BackupStatus {
  lastExportAt: IsoInstant | null;
  lastImportAt: IsoInstant | null;
  /** Plus ancienne modification faite ici depuis la dernière sauvegarde ou le dernier import. */
  oldestUnsavedChange: IsoInstant | null;
}

/**
 * Nombre de jours depuis lesquels des modifications ne sont sauvegardées nulle part, ou null
 * s'il n'y a rien à rappeler. Un appareil qui ne fait qu'importer (le Mac) n'est jamais relancé :
 * ce qu'il reçoit n'est pas une modification locale.
 */
export function backupReminderDays(status: BackupStatus, now: Date): number | null {
  if (!status.oldestUnsavedChange) return null;
  const days = differenceInCalendarDays(now, parseISO(status.oldestUnsavedChange));
  return days >= REMINDER_AFTER_DAYS ? days : null;
}
