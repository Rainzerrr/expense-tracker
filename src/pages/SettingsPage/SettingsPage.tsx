import { useTranslation } from 'react-i18next';
import { CsvCard, ImportCard, TransferCard } from '@/domains/backup/data';
import { BudgetSettingsCard } from '@/domains/budget/settings';
import { StatementImportCard } from '@/domains/statements/react';
import { SyncCard } from '@/domains/sync/settings';
import { Heading } from '@/shared/ui/atoms/Heading';
import { StorageStatus } from './StorageStatus';
import './SettingsPage.scss';

export function SettingsPage() {
  const { t } = useTranslation('settings');
  return (
    <div className="settings-page">
      <div className="settings-page__header">
        <Heading level={1}>{t('page.title')}</Heading>
      </div>
      <BudgetSettingsCard />
      <div className="settings-page__wide">
        <h2 className="settings-page__section">{t('data.title')}</h2>
        <p className="settings-page__section-text">{t('data.intro')}</p>
      </div>
      <div className="settings-page__wide">
        <SyncCard />
      </div>
      <TransferCard />
      <ImportCard />
      <div className="settings-page__wide">
        <StatementImportCard />
      </div>
      <CsvCard />
      <StorageStatus />
    </div>
  );
}
