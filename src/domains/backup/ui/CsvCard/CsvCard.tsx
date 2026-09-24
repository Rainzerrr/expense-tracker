import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppServices } from '@/app/AppServices';
import { useCatalog, useCatalogLabels } from '@/domains/categorization/react';
import { downloadFile } from '@/shared/lib/files';
import { todayInLisbon } from '@/shared/lib/time';
import { Button } from '@/shared/ui/atoms/Button';
import { CardSection } from '@/shared/ui/molecules/CardSection';
import { useBackupActions } from '../../application/useBackup';
import { expensesToCsv } from '../../domain/expenseCsv';
import './CsvCard.scss';

type Message = { kind: 'ok' | 'error'; text: string } | null;

/** Un CSV lisible dans Excel ou Numbers. Ce n'est pas une sauvegarde : il ne se réimporte pas. */
export function CsvCard() {
  const { t } = useTranslation('settings');
  const { now } = useAppServices();
  const actions = useBackupActions();
  const catalog = useCatalog();
  const labels = useCatalogLabels();
  const [message, setMessage] = useState<Message>(null);

  const download = async () => {
    if (!catalog) return;
    setMessage(null);
    try {
      const data = await actions.readData();
      const csv = expensesToCsv(data.expenses, catalog, {
        header: [
          t('data.csv.header.date'),
          t('data.csv.header.amount'),
          t('data.csv.header.category'),
          t('data.csv.header.subcategory'),
          t('data.csv.header.tags'),
          t('data.csv.header.note'),
        ],
        category: labels.category,
        subcategory: labels.subcategory,
        tag: labels.tag,
      });
      const name = `lisboa-depenses-${todayInLisbon(now())}.csv`;
      downloadFile(new File([csv], name, { type: 'text/csv;charset=utf-8' }));
      setMessage({ kind: 'ok', text: t('data.csv.done', { name }) });
    } catch (error) {
      console.error(error);
      setMessage({ kind: 'error', text: t('data.csv.error') });
    }
  };

  return (
    <CardSection title={t('data.csv.title')}>
      <p className="csv-card__text">{t('data.csv.text')}</p>
      <div>
        <Button variant="secondary" disabled={!catalog} onClick={() => void download()}>
          {t('data.csv.download')}
        </Button>
      </div>
      <p
        className={message?.kind === 'error' ? 'csv-card__error' : 'csv-card__ok'}
        role={message?.kind === 'error' ? 'alert' : 'status'}
      >
        {message?.text}
      </p>
    </CardSection>
  );
}
