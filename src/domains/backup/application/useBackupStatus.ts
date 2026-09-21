import { useLiveQuery } from 'dexie-react-hooks';
import { useAppServices } from '@/app/AppServices';
import { getBackupStatus } from './backupStatus';

/** Dernier export/import et ancienneté des modifications non sauvegardées, toujours à jour. */
export function useBackupStatus() {
  const { backup } = useAppServices();
  return useLiveQuery(() => getBackupStatus(backup), [backup]);
}
