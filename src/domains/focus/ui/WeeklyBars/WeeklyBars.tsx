import clsx from 'clsx';
import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { formatMoney, formatMonthShort } from '@/shared/i18n/format';
import type { YearMonth } from '@/shared/lib/time';
import { CardSection } from '@/shared/ui/molecules/CardSection';
import type { WeekBar } from '../../domain/focusStats';
import './WeeklyBars.scss';

export interface WeeklyBarsProps {
  weeks: readonly WeekBar[];
  month: YearMonth;
}

/** « Semaine par semaine » : une barre par semaine du mois. La semaine en cours est en pointillés (pas terminée). */
export function WeeklyBars({ weeks, month }: WeeklyBarsProps) {
  const { t } = useTranslation('focus');
  const monthShort = formatMonthShort(month);
  const highest = Math.max(...weeks.map((week) => week.amount), 1);

  return (
    <CardSection title={t('weekly.title')}>
      <ol className="weekly-bars">
        {weeks.map((week) => {
          const range = { start: week.startDay, end: week.endDay, month: monthShort };
          // Une barre vide garde un filet visible : « rien dépensé » n'est pas « pas de donnée ».
          const height = week.amount === 0 ? 2 : Math.max((week.amount / highest) * 100, 6);
          return (
            <li key={week.startDay} className="weekly-bars__week">
              <span className="weekly-bars__amount">
                {formatMoney(week.amount, { withCents: false })}
              </span>
              <span className="weekly-bars__track" aria-hidden="true">
                <span
                  className={clsx(
                    'weekly-bars__bar',
                    week.isCurrent && 'weekly-bars__bar--current',
                  )}
                  style={{ '--bar-height': `${height}%` } as CSSProperties}
                />
              </span>
              <span className="weekly-bars__range">
                {week.isCurrent ? t('weekly.current', range) : t('weekly.range', range)}
              </span>
            </li>
          );
        })}
      </ol>
    </CardSection>
  );
}
