import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import type { To } from 'react-router-dom';
import type { Expense } from '@/domains/expenses';
import { formatMoney, formatWeekdayDayMonth, formatWeekdayName } from '@/shared/i18n/format';
import { addDays } from '@/shared/lib/time';
import type { LocalDate } from '@/shared/lib/time';
import { CardSection } from '@/shared/ui/molecules/CardSection';
import './FocusEntries.scss';

const LIMIT = 3;

export interface FocusEntriesProps {
  /** Dépenses du focus, de la plus récente à la plus ancienne. */
  entries: readonly Expense[];
  today: LocalDate;
  /** L'historique filtré sur ce focus. */
  seeAllTo: To;
}

/** « Dernières entrées » : les trois plus récentes, et un lien vers toutes. */
export function FocusEntries({ entries, today, seeAllTo }: FocusEntriesProps) {
  const { t } = useTranslation('focus');
  const { t: tCommon } = useTranslation();

  const dayTitle = (date: LocalDate) =>
    date === today
      ? tCommon('relativeDay.today')
      : date === addDays(today, -1)
        ? tCommon('relativeDay.yesterday')
        : formatWeekdayName(date);

  return (
    <CardSection title={t('entries.title')}>
      {entries.length === 0 ? (
        <p className="focus-entries__empty">{t('entries.empty')}</p>
      ) : (
        <>
          <ul className="focus-entries__list">
            {entries.slice(0, LIMIT).map((expense) => (
              <li key={expense.id} className="focus-entries__item">
                <span className="focus-entries__day">
                  <span className="focus-entries__title">{dayTitle(expense.date)}</span>
                  <span className="focus-entries__date">{formatWeekdayDayMonth(expense.date)}</span>
                </span>
                <span className="focus-entries__amount">{formatMoney(-expense.amount)}</span>
              </li>
            ))}
          </ul>
          <Link className="focus-entries__all" to={seeAllTo}>
            {t('entries.seeAll', { count: entries.length })}
          </Link>
        </>
      )}
    </CardSection>
  );
}
