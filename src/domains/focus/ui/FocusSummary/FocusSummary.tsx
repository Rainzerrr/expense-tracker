import { useTranslation } from 'react-i18next';
import type { CSSProperties } from 'react';
import { formatMoney, formatMonthName } from '@/shared/i18n/format';
import type { YearMonth } from '@/shared/lib/time';
import { StatTile } from '@/shared/ui/molecules/StatTile';
import type { FocusStats } from '../../domain/focusStats';
import type { FocusDescription } from '../useFocusLabels';
import './FocusSummary.scss';

export interface FocusSummaryProps {
  description: FocusDescription;
  stats: FocusStats;
  month: YearMonth;
}

/** Le focus en un coup d'œil : total du mois, part des dépenses, rythme, nombre d'achats, panier moyen. */
export function FocusSummary({ description, stats, month }: FocusSummaryProps) {
  const { t } = useTranslation('focus');
  const percent = Math.round(stats.shareOfMonth * 100);
  const monthName = formatMonthName(month);

  return (
    <section
      className="focus-summary"
      aria-label={description.subtitle}
      style={{ '--focus-color': description.color } as CSSProperties}
    >
      <p className="focus-summary__chip">
        <span className="focus-summary__dot" aria-hidden="true" />
        {description.subtitle}
      </p>
      <p className="focus-summary__amount">{formatMoney(stats.total)}</p>
      <p className="focus-summary__share">
        {stats.total > 0 && percent === 0
          ? t('summary.shareLessThanOne', { month: monthName })
          : t('summary.share', { percent, month: monthName })}
      </p>

      <div className="focus-summary__tiles">
        <StatTile
          value={t('summary.approximately', {
            amount: formatMoney(stats.weeklyRate, { withCents: false }),
          })}
          label={t('summary.perWeek')}
        />
        <StatTile
          value={String(stats.count)}
          label={t('summary.purchases', { count: stats.count })}
        />
        <StatTile
          value={stats.averageBasket === null ? '—' : formatMoney(stats.averageBasket)}
          label={t('summary.averageBasket')}
        />
      </div>
    </section>
  );
}
