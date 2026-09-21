import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useEditExpensePanel, useNewExpensePanel } from '@/app/panels';
import { useDeleteWithUndo } from '@/app/useDeleteWithUndo';
import { useToday } from '@/app/useToday';
import type { CategoryId, TagId } from '@/domains/categorization';
import { useCatalog } from '@/domains/categorization/react';
import { groupByDay, sumCents } from '@/domains/expenses';
import {
  ExpenseList,
  HistoryFilters,
  useFilteredExpenses,
  useMonthExpenses,
} from '@/domains/expenses/react';
import { navigableMonths } from '@/domains/stay';
import { useSelectedMonth, useStay } from '@/domains/stay/react';
import { formatMoney, formatMonthName, formatMonthTitle } from '@/shared/i18n/format';
import { Button } from '@/shared/ui/atoms/Button';
import { Heading } from '@/shared/ui/atoms/Heading';
import { LinkButton } from '@/shared/ui/atoms/LinkButton';
import { EmptyState } from '@/shared/ui/molecules/EmptyState';
import { useHistoryFilters } from './useHistoryFilters';
import './HistoryPage.scss';

const PAGE_SIZE = 30;

export function HistoryPage() {
  const { t } = useTranslation('expenses');
  const today = useToday();
  const stay = useStay();
  const { month, select } = useSelectedMonth(stay, today);
  const filters = useHistoryFilters();
  const newPanel = useNewExpensePanel();
  const editPanel = useEditExpensePanel();
  const deleteWithUndo = useDeleteWithUndo();
  const catalog = useCatalog();
  const monthExpenses = useMonthExpenses(month);
  const [visible, setVisible] = useState(PAGE_SIZE);

  const filtered = useFilteredExpenses(monthExpenses, catalog, {
    categoryId: filters.categoryId as CategoryId,
    tagId: filters.tagId as TagId,
    query: filters.query,
  });

  const total = filtered ? sumCents(filtered.map((e) => e.amount)) : 0;
  const shown = filtered?.slice(0, visible) ?? [];
  const hasMore = (filtered?.length ?? 0) > visible;

  return (
    <div className="history-page">
      <header className="history-page__header">
        <div>
          <p className="history-page__eyebrow">{formatMonthTitle(month)}</p>
          <Heading level={1}>{t('history.title')}</Heading>
        </div>
        <p className="history-page__total">{t('history.total', { amount: formatMoney(total) })}</p>
        <div className="history-page__action">
          <LinkButton to={newPanel.openTo} state={newPanel.openState}>
            {t('history.newExpense')}
          </LinkButton>
        </div>
      </header>

      {catalog && (
        <HistoryFilters
          catalog={catalog}
          months={navigableMonths(stay, today)}
          month={month}
          onMonthChange={select}
          query={filters.query}
          onQueryChange={filters.setQuery}
          categoryId={filters.categoryId}
          onCategoryChange={filters.setCategory}
          tagId={filters.tagId}
          onTagChange={filters.setTag}
        />
      )}

      {/* Annonce le nombre de résultats aux lecteurs d'écran quand la recherche change. */}
      <p className="u-visually-hidden" role="status">
        {filtered ? t('history.count', { count: filtered.length }) : ''}
      </p>

      {catalog && filtered && filtered.length > 0 && (
        <>
          <ExpenseList
            groups={groupByDay(shown)}
            catalog={catalog}
            today={today}
            selectedId={editPanel.expenseId}
            editTo={editPanel.editTo}
            editState={editPanel.openState}
            onDelete={(id) => void deleteWithUndo(id)}
          />
          {hasMore && (
            <Button variant="secondary" onClick={() => setVisible((count) => count + PAGE_SIZE)}>
              {t('history.loadMore')}
            </Button>
          )}
        </>
      )}

      {filtered && filtered.length === 0 && filters.hasActiveFilters && (
        <EmptyState
          title={t('history.noResults.title')}
          text={t('history.noResults.text')}
          action={
            <Button variant="secondary" onClick={filters.clear}>
              {t('history.filters.clear')}
            </Button>
          }
        />
      )}

      {filtered && filtered.length === 0 && !filters.hasActiveFilters && (
        <EmptyState
          title={t('history.empty.title', { month: formatMonthName(month) })}
          text={t('history.empty.text')}
        />
      )}
    </div>
  );
}
