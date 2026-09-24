import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import type { To } from 'react-router-dom';
import type { Catalog } from '@/domains/categorization';
import { categoryIcon, useCatalogLabels } from '@/domains/categorization/react';
import { formatMoney } from '@/shared/i18n/format';
import { useDayHeader } from '@/shared/i18n/useDayLabel';
import type { LocalDate } from '@/shared/lib/time';
import type { DayGroup } from '../../domain/groupByDay';
import type { Expense, ExpenseId } from '../../domain/expense';
import { ExpenseListRow } from './ExpenseListRow';
import './ExpenseList.scss';

export interface ExpenseListProps {
  groups: DayGroup<Expense>[];
  catalog: Catalog;
  today: LocalDate;
  /** Dépense en cours de modification : sa ligne est mise en avant. */
  selectedId: ExpenseId | null;
  editTo: (id: ExpenseId) => To;
  editState: unknown;
  onDelete: (id: ExpenseId) => void;
}

/**
 * Mobile : des cartes par jour, avec le total du jour.
 * Desktop : un tableau (Date, Dépense, Tag, Montant) ; les en-têtes de jour disparaissent, la date passe dans chaque ligne.
 */
export function ExpenseList({
  groups,
  catalog,
  today,
  selectedId,
  editTo,
  editState,
  onDelete,
}: ExpenseListProps) {
  const { t } = useTranslation('expenses');
  const labels = useCatalogLabels();
  const dayHeader = useDayHeader();
  const idPrefix = useId();

  const tagName = (tagId: string) => catalog.tags.find((tag) => tag.id === tagId);

  return (
    <div className="expense-list">
      <div className="expense-list__columns" aria-hidden="true">
        <span>{t('history.columns.date')}</span>
        <span>{t('history.columns.expense')}</span>
        <span>{t('history.columns.tag')}</span>
        <span className="expense-list__column-amount">{t('history.columns.amount')}</span>
      </div>

      {groups.map((group) => {
        const headingId = `${idPrefix}-${group.date}`;
        return (
          <section key={group.date} className="expense-list__day" aria-labelledby={headingId}>
            <header className="expense-list__day-header">
              <h3 id={headingId} className="expense-list__day-title">
                {dayHeader(group.date, today)}
              </h3>
              <span className="expense-list__day-total">{formatMoney(group.total)}</span>
            </header>
            <ul className="expense-list__items">
              {group.expenses.flatMap((expense) => {
                const category = catalog.categories.find((c) => c.id === expense.categoryId);
                if (!category) return [];
                const subcategory = catalog.subcategories.find(
                  (s) => s.id === expense.subcategoryId,
                );
                const categoryLabel = labels.category(category);
                return [
                  <li key={expense.id}>
                    <ExpenseListRow
                      icon={categoryIcon(category)}
                      color={`var(--category-${category.color})`}
                      label={subcategory ? labels.subcategory(subcategory) : categoryLabel}
                      categoryLabel={categoryLabel}
                      note={expense.note}
                      tags={expense.tagIds.flatMap((id) => {
                        const tag = tagName(id);
                        return tag ? [labels.tag(tag)] : [];
                      })}
                      amount={formatMoney(-expense.amount)}
                      dateLabel={dayHeader(expense.date, today).split(' · ').at(-1) ?? ''}
                      selected={expense.id === selectedId}
                      editTo={editTo(expense.id)}
                      editState={editState}
                      editLabel={t('history.row.edit')}
                      swipeEditLabel={t('history.row.swipeEdit')}
                      swipeDeleteLabel={t('history.row.swipeDelete')}
                      onDelete={() => onDelete(expense.id)}
                    />
                  </li>,
                ];
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
