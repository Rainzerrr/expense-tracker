import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppServices } from '@/app/AppServices';
import { formatDayMonthYear } from '@/shared/i18n/format';
import { todayInLisbon } from '@/shared/lib/time';
import { Button } from '@/shared/ui/atoms/Button';
import { CardSection } from '@/shared/ui/molecules/CardSection';
import { FileDropZone } from '@/shared/ui/molecules/FileDropZone';
import { useBackupActions } from '../../application/useBackup';
import type { BackupError, BackupFile } from '../../domain/backupFile';
import { hasChanges } from '../../domain/mergeBackup';
import type { MergeSummary } from '../../domain/mergeBackup';
import './ImportCard.scss';

// Une sauvegarde de plusieurs années reste bien en dessous : au-delà, ce n'est pas un bon fichier.
const MAX_FILE_BYTES = 20 * 1024 * 1024;

type ReadError = BackupError | 'tooLarge' | 'readFailed';
type State =
  | { step: 'idle' }
  | { step: 'reading' }
  | { step: 'preview'; file: BackupFile; summary: MergeSummary }
  | { step: 'done'; summary: MergeSummary }
  | { step: 'error'; error: ReadError };

const summaryValues = (summary: MergeSummary) => ({
  added: summary.expenses.added,
  updated: summary.expenses.updated,
  deleted: summary.expenses.deleted,
});

/** Reçoit un fichier d'un autre appareil : aperçu de ce qui changera, puis confirmation. */
export function ImportCard() {
  const { t } = useTranslation('settings');
  const { isDemo } = useAppServices();
  const actions = useBackupActions();
  const [state, setState] = useState<State>({ step: 'idle' });

  const read = async (file: File) => {
    if (file.size > MAX_FILE_BYTES) return setState({ step: 'error', error: 'tooLarge' });
    setState({ step: 'reading' });
    try {
      const preview = await actions.previewImport(await file.text());
      setState(
        preview.ok
          ? { step: 'preview', file: preview.file, summary: preview.plan.summary }
          : { step: 'error', error: preview.error },
      );
    } catch (error) {
      console.error(error);
      setState({ step: 'error', error: 'readFailed' });
    }
  };

  const confirm = async (file: BackupFile) => {
    try {
      setState({ step: 'done', summary: await actions.applyImport(file) });
    } catch (error) {
      console.error(error);
      setState({ step: 'error', error: 'readFailed' });
    }
  };

  return (
    <CardSection title={t('data.receive.title')}>
      <p className="import-card__text">{t('data.receive.text')}</p>

      <FileDropZone
        label={t('data.receive.choose')}
        hint={t('data.receive.drop')}
        accept=".json,application/json,text/plain"
        disabled={isDemo || state.step === 'reading'}
        onFile={(file) => void read(file)}
      />
      {isDemo && <p className="import-card__text">{t('data.demoNotice')}</p>}

      <div className="import-card__result" role="status" aria-live="polite">
        {state.step === 'reading' && <p>{t('data.receive.reading')}</p>}

        {state.step === 'preview' && (
          <div className="import-card__preview">
            <h3 className="import-card__title">{t('data.preview.title')}</h3>
            <p>
              {t('data.preview.file', {
                date: formatDayMonthYear(todayInLisbon(new Date(state.file.exportedAt))),
              })}
            </p>
            {hasChanges(state.summary) ? (
              <p className="import-card__figures">
                {t('data.preview.summary', summaryValues(state.summary))}
              </p>
            ) : (
              <p>{t('data.preview.upToDate')}</p>
            )}
            {state.summary.expenses.skipped > 0 && (
              <p>{t('data.preview.skipped', { count: state.summary.expenses.skipped })}</p>
            )}
            <div className="import-card__buttons">
              {hasChanges(state.summary) && (
                <Button onClick={() => void confirm(state.file)}>
                  {t('data.preview.confirm')}
                </Button>
              )}
              <Button variant="secondary" onClick={() => setState({ step: 'idle' })}>
                {t('data.preview.cancel')}
              </Button>
            </div>
          </div>
        )}

        {state.step === 'done' && (
          <div className="import-card__done">
            <h3 className="import-card__title">{t('data.done.title')}</h3>
            <p className="import-card__figures">
              {t('data.done.summary', summaryValues(state.summary))}
            </p>
          </div>
        )}
      </div>

      {state.step === 'error' && (
        <p className="import-card__error" role="alert">
          {t(`data.errors.${state.error}`)}
        </p>
      )}
    </CardSection>
  );
}
