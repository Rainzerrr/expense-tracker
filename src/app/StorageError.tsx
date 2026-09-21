import { useTranslation } from 'react-i18next';
import { EmptyState } from '@/shared/ui/molecules/EmptyState';

/** Affichée si la base locale ne peut pas s'ouvrir (par exemple navigation privée). */
export function StorageError() {
  const { t } = useTranslation();
  return <EmptyState title={t('error.storage.title')} text={t('error.storage.text')} />;
}
