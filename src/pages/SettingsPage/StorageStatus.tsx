import { useTranslation } from 'react-i18next';
import { useStorageProtection } from '@/shared/hooks/useStorageProtection';
import { CardSection } from '@/shared/ui/molecules/CardSection';

/** Dit si le navigateur protège les données de l'application contre un effacement automatique. */
export function StorageStatus() {
  const { t } = useTranslation('settings');
  const protection = useStorageProtection();
  if (!protection) return null;

  return (
    <CardSection title={t('storage.title')}>
      <p role="status">{t(`storage.${protection}`)}</p>
    </CardSection>
  );
}
