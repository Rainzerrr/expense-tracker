import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import type { Catalog } from '@/domains/categorization';
import { categoryIcon, useCatalogLabels } from '@/domains/categorization/react';
import { formatMoney } from '@/shared/i18n/format';
import { useDayLabel } from '@/shared/i18n/useDayLabel';
import type { LocalDate } from '@/shared/lib/time';
import { EmptyState } from '@/shared/ui/molecules/EmptyState';
import { CardSection } from '@/shared/ui/molecules/CardSection';
import type { Expense } from '../../domain/expense';
import { ExpenseRow } from '../ExpenseRow';
import './RecentExpenses.scss';

const DEFAULT_LIMIT = 5;

export interface RecentExpensesProps {
  /** Dépenses du mois, de la plus récente à la plus ancienne. */
  expenses: readonly Expense[];
  catalog: Catalog;
  today: LocalDate;
  historyHref: string;
  limit?: number;
}

export function RecentExpenses({
  expenses,
  catalog,
  today,
  historyHref,
  limit = DEFAULT_LIMIT,
}: RecentExpensesProps) {
  const { t } = useTranslation('analytics');
  const { t: tExpenses } = useTranslation('expenses');
  const labels = useCatalogLabels();
  const dayLabel = useDayLabel();

  const rows = expenses.slice(0, limit).flatMap((expense) => {
    const category = catalog.categories.find((c) => c.id === expense.categoryId);
    if (!category) return [];
    const subcategory = catalog.subcategories.find((s) => s.id === expense.subcategoryId);
    const categoryLabel = labels.category(category);
    return [
      <li key={expense.id} className="recent-expenses__item">
        <ExpenseRow
          icon={categoryIcon(category)}
          color={`var(--category-${category.color})`}
          label={subcategory ? labels.subcategory(subcategory) : categoryLabel}
          meta={tExpenses('row.meta', {
            category: categoryLabel,
            day: dayLabel(expense.date, today),
          })}
          amount={formatMoney(-expense.amount)}
        />
      </li>,
    ];
  });

  return (
    <CardSection
      title={t('recent.title')}
      action={<Link to={historyHref}>{t('recent.history')}</Link>}
    >
      {rows.length > 0 ? (
        <ul className="recent-expenses__list">{rows}</ul>
      ) : (
        <EmptyState title={t('recent.emptyTitle')} text={t('recent.emptyText')} />
      )}
    </CardSection>
  );
}
