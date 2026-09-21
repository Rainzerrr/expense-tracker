import { useTranslation } from 'react-i18next';
import { CsvCard, ImportCard, TransferCard } from '@/domains/backup/data';
import { Heading } from '@/shared/ui/atoms/Heading';
import './SettingsPage.scss';

export function SettingsPage() {
  const { t } = useTranslation('settings');
  return (
    <div className="settings-page">
      <div className="settings-page__header">
        <Heading level={1}>{t('page.title')}</Heading>
        <div className="settings-page__intro">
          <h2 className="settings-page__section">{t('data.title')}</h2>
          <p>{t('data.intro')}</p>
        </div>
      </div>
      <TransferCard />
      <ImportCard />
      <CsvCard />
    </div>
  );
}
