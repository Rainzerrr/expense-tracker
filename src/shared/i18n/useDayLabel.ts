import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { addDays } from '@/shared/lib/time';
import type { LocalDate } from '@/shared/lib/time';
import { formatDayMonth, formatWeekdayDayMonth } from './format';

/** « Aujourd'hui », « Hier », puis « 17 sept. ». */
export function useDayLabel() {
  const { t } = useTranslation();
  return useCallback(
    (date: LocalDate, today: LocalDate) => {
      if (date === today) return t('relativeDay.today');
      if (date === addDays(today, -1)) return t('relativeDay.yesterday');
      return formatDayMonth(date);
    },
    [t],
  );
}

/** En-tête d'un jour de l'historique : « Aujourd'hui · dim. 20 sept. », « Hier · sam. 19 sept. », puis « ven. 18 sept. ». */
export function useDayHeader() {
  const { t } = useTranslation();
  return useCallback(
    (date: LocalDate, today: LocalDate) => {
      const weekday = formatWeekdayDayMonth(date);
      if (date === today) return `${t('relativeDay.today')} · ${weekday}`;
      if (date === addDays(today, -1)) return `${t('relativeDay.yesterday')} · ${weekday}`;
      return weekday;
    },
    [t],
  );
}
