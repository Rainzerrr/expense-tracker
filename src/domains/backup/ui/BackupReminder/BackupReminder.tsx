import { useTranslation } from 'react-i18next';
import { useAppServices } from '@/app/AppServices';
import { NoticeBanner } from '@/shared/ui/molecules/NoticeBanner';
import { useBackupStatus } from '../../application/useBackupStatus';
import { backupReminderDays } from '../../domain/backupReminder';

const SETTINGS_PATH = '/settings';

/** Rappelle de sauvegarder quand des modifications ne sont nulle part ailleurs depuis une semaine. Jamais en démo. */
export function BackupReminder() {
  const { t } = useTranslation('settings');
  const { isDemo, now } = useAppServices();
  const status = useBackupStatus();
  if (isDemo || !status) return null;

  const days = backupReminderDays(status, now());
  if (days === null) return null;

  return (
    <NoticeBanner
      message={t('data.reminder.message', { days })}
      actionLabel={t('data.reminder.action')}
      to={SETTINGS_PATH}
    />
  );
}
