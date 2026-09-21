import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import type { To } from 'react-router-dom';
import type { CSSProperties } from 'react';
import type { Catalog } from '@/domains/categorization';
import type { Expense } from '@/domains/expenses';
import { formatMoney } from '@/shared/i18n/format';
import type { LocalDate, YearMonth } from '@/shared/lib/time';
import { LinkButton } from '@/shared/ui/atoms/LinkButton';
import { CardSection } from '@/shared/ui/molecules/CardSection';
import { EmptyState } from '@/shared/ui/molecules/EmptyState';
import type { Focus, FocusId } from '../../domain/focus';
import { focusStats } from '../../domain/focusStats';
import { useFocusLabels } from '../useFocusLabels';
import './FocusCards.scss';

export interface FocusCardsProps {
  focuses: readonly Focus[];
  catalog: Catalog;
  /** Dépenses non supprimées du mois affiché. */
  expenses: readonly Expense[];
  month: YearMonth;
  today: LocalDate;
  focusTo: (id: FocusId) => To;
  manageTo: To;
  manageState: unknown;
}

/** « Mes focus » du dashboard : un coup d'œil sur ce que coûtent les postes qu'on suit de près. */
export function FocusCards({
  focuses,
  catalog,
  expenses,
  month,
  today,
  focusTo,
  manageTo,
  manageState,
}: FocusCardsProps) {
  const { t } = useTranslation('focus');
  const describe = useFocusLabels(catalog);

  const cards = focuses.flatMap((focus) => {
    const description = describe(focus);
    if (!description) return [];
    const stats = focusStats({ target: focus, expenses, month, today });
    return [{ focus, description, stats }];
  });

  return (
    <CardSection
      title={t('cards.title')}
      action={
        <Link to={manageTo} state={manageState}>
          {t('cards.manage')}
        </Link>
      }
    >
      {cards.length === 0 ? (
        <EmptyState
          title={t('cards.empty.title')}
          text={t('cards.empty.text')}
          action={
            <LinkButton to={manageTo} state={manageState}>
              {t('cards.empty.action')}
            </LinkButton>
          }
        />
      ) : (
        <ul className="focus-cards__grid">
          {cards.map(({ focus, description, stats }) => (
            <li key={focus.id}>
              <Link
                className="focus-cards__card"
                to={focusTo(focus.id)}
                style={{ '--focus-color': description.color } as CSSProperties}
              >
                <span className="focus-cards__name">
                  <span className="focus-cards__dot" aria-hidden="true" />
                  {description.name}
                </span>
                <span className="focus-cards__subtitle">{description.subtitle}</span>
                <span className="focus-cards__amount">{formatMoney(stats.total)}</span>
                <span className="focus-cards__rate">
                  {t('cards.perWeek', {
                    amount: formatMoney(stats.weeklyRate, { withCents: false }),
                  })}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </CardSection>
  );
}
