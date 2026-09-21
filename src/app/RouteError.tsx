import { useTranslation } from 'react-i18next';
import { Button } from '@/shared/ui/atoms/Button';
import { EmptyState } from '@/shared/ui/molecules/EmptyState';

export function RouteError() {
  const { t } = useTranslation();
  return (
    <EmptyState
      title={t('error.title')}
      text={t('error.text')}
      action={<Button onClick={() => window.location.reload()}>{t('error.retry')}</Button>}
    />
  );
}
