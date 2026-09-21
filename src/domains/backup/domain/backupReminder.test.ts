import type { IsoInstant } from '@/shared/lib/time';
import { backupReminderDays } from './backupReminder';
import type { BackupStatus } from './backupReminder';

const now = new Date('2026-09-21T12:00:00Z');
const status = (oldest: string | null): BackupStatus => ({
  lastExportAt: null,
  lastImportAt: null,
  oldestUnsavedChange: oldest as IsoInstant | null,
});

describe('backupReminderDays', () => {
  it('ne rappelle rien quand il n’y a aucune modification non sauvegardée', () => {
    expect(backupReminderDays(status(null), now)).toBeNull();
  });

  it('ne rappelle rien avant 7 jours', () => {
    expect(backupReminderDays(status('2026-09-15T12:00:00.000Z'), now)).toBeNull();
  });

  it('rappelle à partir de 7 jours et indique l’ancienneté', () => {
    expect(backupReminderDays(status('2026-09-14T12:00:00.000Z'), now)).toBe(7);
    expect(backupReminderDays(status('2026-09-01T09:00:00.000Z'), now)).toBe(20);
  });
});
