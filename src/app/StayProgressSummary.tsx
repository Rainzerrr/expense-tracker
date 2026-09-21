import { useTranslation } from 'react-i18next';
import { stayDayNumber, stayLengthDays, stayProgress } from '@/domains/stay';
import { useStay } from '@/domains/stay/react';
import { formatDayMonthYear } from '@/shared/i18n/format';
import { StayProgress } from '@/shared/ui/molecules/StayProgress';
import { useToday } from './useToday';

/** « Séjour Erasmus · J20 / 153 » avec sa barre : affiché dans la barre latérale et sur le dashboard mobile. */
export function StayProgressSummary() {
  const { t } = useTranslation('analytics');
  const stay = useStay();
  const today = useToday();
  return (
    <StayProgress
      title={t('stay.title')}
      dayLabel={t('stay.day', { day: stayDayNumber(stay, today), total: stayLengthDays(stay) })}
      rangeLabel={t('stay.range', {
        start: formatDayMonthYear(stay.start),
        end: formatDayMonthYear(stay.end),
      })}
      progress={stayProgress(stay, today)}
    />
  );
}
