import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { Cents } from '@/domains/expenses';
import { formatMoney } from '@/shared/i18n/format';
import { StatTile } from '@/shared/ui/molecules/StatTile';
import type { MonthSummary } from '../../domain/summarizeMonth';
import './SummaryCard.scss';

export interface SummaryCardProps {
  summary: MonthSummary;
  /** « septembre » : inséré dans « Dépensé en septembre ». */
  monthName: string;
  daysInMonth: number;
  /** Total depuis le début du séjour. */
  stayTotal: Cents;
  /** Part du séjour écoulée, entre 0 et 100. */
  stayPercent: number;
  /** Mobile : la barre de progression du séjour, dans la carte. */
  children?: ReactNode;
}

/**
 * Mobile : une carte (dépensé, moyenne, fin de mois, progression du séjour).
 * Desktop : quatre tuiles côte à côte.
 */
export function SummaryCard({
  summary,
  monthName,
  daysInMonth,
  stayTotal,
  stayPercent,
  children,
}: SummaryCardProps) {
  const { t } = useTranslation('analytics');
  const { projection } = summary;
  const isOver = projection.remainingDays === 0;

  return (
    <section className="summary-card" aria-label={t('dashboard.projectionLong')}>
      <div className="summary-card__spent">
        {/* Deux libellés : « en septembre » (mobile) et « ce mois » (desktop) sont masqués tour à tour. */}
        <p className="summary-card__label summary-card__label--mobile">
          {t('dashboard.spentIn', { month: monthName })}
        </p>
        <p className="summary-card__label summary-card__label--desktop">
          {t('dashboard.spentThisMonth')}
        </p>
        <p className="summary-card__amount">{formatMoney(projection.spent)}</p>
        <p className="summary-card__hint">
          {t('dashboard.dayOfMonth', { day: projection.elapsedDays, total: daysInMonth })}
        </p>
      </div>

      <div className="summary-card__tiles">
        <StatTile
          tone="accent"
          label={t('dashboard.dailyAverage')}
          value={formatMoney(Math.round(projection.variableDailyAverage))}
          hint={t('dashboard.excludingHousing')}
        />
        <StatTile
          tone="success"
          label={t('dashboard.monthEnd')}
          value={`${isOver ? '' : '≈ '}${formatMoney(projection.projectedTotal, { withCents: false })}`}
          hint={
            isOver
              ? t('dashboard.monthOver')
              : t('dashboard.remainingDays', { count: projection.remainingDays })
          }
        />
        <StatTile
          className="summary-card__stay-total"
          label={t('dashboard.sinceStart')}
          value={formatMoney(stayTotal)}
          hint={t('dashboard.stayElapsed', { percent: stayPercent })}
        />
      </div>

      {children && <div className="summary-card__stay">{children}</div>}
    </section>
  );
}
