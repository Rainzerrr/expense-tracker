import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import type { To } from 'react-router-dom';
import type { BudgetStatus } from '../../domain/budgetStatus';
import { formatMoney } from '@/shared/i18n/format';
import { CardSection } from '@/shared/ui/molecules/CardSection';
import { ProgressBar } from '@/shared/ui/atoms/ProgressBar';
import './BudgetCard.scss';

export interface BudgetCardProps {
  status: BudgetStatus;
  manageTo: To;
  manageState?: unknown;
}

/** Suivi du budget du mois : logement, courses + activités (souple), et le total qui compte vraiment. */
export function BudgetCard({ status, manageTo, manageState }: BudgetCardProps) {
  const { t } = useTranslation('analytics');

  const rows = [
    { key: 'housing', label: t('budget.housing'), line: status.housing, tone: 'danger' as const },
    {
      key: 'flex',
      label: t('budget.flex'),
      line: status.flex,
      tone: 'warning' as const,
      soft: true,
    },
    {
      key: 'total',
      label: t('budget.total'),
      line: status.total,
      tone: 'danger' as const,
      emphasis: true,
    },
  ];

  return (
    <CardSection
      title={t('budget.title')}
      action={
        <Link to={manageTo} state={manageState}>
          {t('budget.manage')}
        </Link>
      }
    >
      <ul className="budget-card__list">
        {rows.map((row) => (
          <li key={row.key} className="budget-card__row">
            <div className="budget-card__head">
              <span className="budget-card__label">{row.label}</span>
              <span className="budget-card__figures">
                {t('budget.of', {
                  spent: formatMoney(row.line.spent),
                  target: formatMoney(row.line.target),
                })}
              </span>
            </div>
            <ProgressBar
              value={row.line.percent}
              label={row.label}
              tone={row.line.isOver ? row.tone : 'accent'}
            />
            <p className="budget-card__hint">
              {row.line.isOver
                ? t('budget.over', { amount: formatMoney(-row.line.remaining) })
                : t('budget.remaining', { amount: formatMoney(row.line.remaining) })}
              {row.soft && row.line.isOver && ` · ${t('budget.softNote')}`}
            </p>
          </li>
        ))}
      </ul>
    </CardSection>
  );
}
