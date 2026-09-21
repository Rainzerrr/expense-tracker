import { useTranslation } from 'react-i18next';
import { Heading } from '@/shared/ui/atoms/Heading';
import { EmptyState } from '@/shared/ui/molecules/EmptyState';

export function StatsPage() {
  const { t } = useTranslation();
  return (
    <>
      <Heading level={1}>{t('pages.stats.title')}</Heading>
      <EmptyState title={t('comingSoon.title')} text={t('comingSoon.text')} />
    </>
  );
}
