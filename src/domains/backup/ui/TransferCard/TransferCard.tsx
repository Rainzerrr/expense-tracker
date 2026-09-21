import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppServices } from '@/app/AppServices';
import { formatDayMonthYear } from '@/shared/i18n/format';
import { downloadFile, shareFile } from '@/shared/lib/files';
import { todayInLisbon } from '@/shared/lib/time';
import { Button } from '@/shared/ui/atoms/Button';
import { CardSection } from '@/shared/ui/molecules/CardSection';
import { useBackupActions } from '../../application/useBackup';
import { useBackupStatus } from '../../application/useBackupStatus';
import './TransferCard.scss';

type Message = { kind: 'ok' | 'error'; text: string } | null;

/** Envoie toutes les données par le menu Partager (AirDrop…), ou les télécharge. */
export function TransferCard() {
  const { t } = useTranslation('settings');
  const { isDemo } = useAppServices();
  const actions = useBackupActions();
  const status = useBackupStatus();
  const [message, setMessage] = useState<Message>(null);
  const [busy, setBusy] = useState(false);

  const run = async (mode: 'share' | 'download') => {
    setBusy(true);
    setMessage(null);
    try {
      const backup = await actions.createBackup();
      const file = new File([backup.text], backup.fileName, { type: 'application/json' });

      // Sans menu Partager (certains navigateurs de bureau), on retombe sur un téléchargement.
      const shared =
        mode === 'share' ? await shareFile(file, t('data.transfer.title')) : 'unsupported';
      if (shared === 'cancelled') return;
      if (shared === 'unsupported') downloadFile(file);

      await actions.recordExport();
      setMessage({
        kind: 'ok',
        text:
          shared === 'shared'
            ? t('data.transfer.shared')
            : t('data.transfer.downloaded', { name: backup.fileName }),
      });
    } catch (error) {
      console.error(error);
      setMessage({ kind: 'error', text: t('data.transfer.error') });
    } finally {
      setBusy(false);
    }
  };

  const dateOf = (instant: string) => formatDayMonthYear(todayInLisbon(new Date(instant)));

  return (
    <CardSection title={t('data.transfer.title')}>
      <p className="transfer-card__text">{t('data.transfer.text')}</p>

      <div className="transfer-card__actions">
        <Button disabled={isDemo || busy} onClick={() => void run('share')}>
          {t('data.transfer.share')}
        </Button>
        <Button variant="secondary" disabled={isDemo || busy} onClick={() => void run('download')}>
          {t('data.transfer.download')}
        </Button>
      </div>

      {isDemo && <p className="transfer-card__note">{t('data.demoNotice')}</p>}

      <div className="transfer-card__status">
        {status?.lastExportAt ? (
          <p>{t('data.status.lastExport', { date: dateOf(status.lastExportAt) })}</p>
        ) : (
          status && <p>{t('data.status.never')}</p>
        )}
        {status?.lastImportAt && (
          <p>{t('data.status.lastImport', { date: dateOf(status.lastImportAt) })}</p>
        )}
      </div>

      <p
        className={message?.kind === 'error' ? 'transfer-card__error' : 'transfer-card__ok'}
        role={message?.kind === 'error' ? 'alert' : 'status'}
      >
        {message?.text}
      </p>
    </CardSection>
  );
}
