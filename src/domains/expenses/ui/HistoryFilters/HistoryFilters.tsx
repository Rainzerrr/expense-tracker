import { useTranslation } from 'react-i18next';
import type { Catalog } from '@/domains/categorization';
import { useCatalogLabels } from '@/domains/categorization/react';
import { formatMonthTitle } from '@/shared/i18n/format';
import type { YearMonth } from '@/shared/lib/time';
import { FilterSelect } from '@/shared/ui/molecules/FilterSelect';
import { SearchField } from '@/shared/ui/molecules/SearchField';
import './HistoryFilters.scss';

export interface HistoryFiltersProps {
  catalog: Catalog;
  months: readonly YearMonth[];
  month: YearMonth;
  onMonthChange: (month: YearMonth) => void;
  query: string;
  onQueryChange: (query: string) => void;
  /** Chaîne vide : aucun filtre. */
  categoryId: string;
  onCategoryChange: (categoryId: string) => void;
  tagId: string;
  onTagChange: (tagId: string) => void;
}

export function HistoryFilters({
  catalog,
  months,
  month,
  onMonthChange,
  query,
  onQueryChange,
  categoryId,
  onCategoryChange,
  tagId,
  onTagChange,
}: HistoryFiltersProps) {
  const { t } = useTranslation('expenses');
  const labels = useCatalogLabels();

  return (
    <div className="history-filters" role="search">
      <div className="history-filters__search">
        <SearchField
          label={t('history.search.label')}
          placeholder={t('history.search.placeholder')}
          value={query}
          onChange={onQueryChange}
        />
      </div>
      <div className="history-filters__chips">
        <FilterSelect
          tone="strong"
          label={t('history.filters.month')}
          value={month}
          options={months.map((value) => ({ value, label: formatMonthTitle(value) }))}
          onChange={(value) => onMonthChange(value as YearMonth)}
        />
        <FilterSelect
          label={t('history.filters.category')}
          emptyLabel={t('history.filters.category')}
          value={categoryId}
          options={catalog.categories.map((c) => ({ value: c.id, label: labels.category(c) }))}
          onChange={onCategoryChange}
        />
        <FilterSelect
          label={t('history.filters.tag')}
          emptyLabel={t('history.filters.tag')}
          value={tagId}
          options={catalog.tags.map((tag) => ({ value: tag.id, label: labels.tag(tag) }))}
          onChange={onTagChange}
        />
      </div>
    </div>
  );
}
