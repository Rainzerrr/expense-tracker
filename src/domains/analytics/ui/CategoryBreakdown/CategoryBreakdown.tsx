import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import type { Catalog } from '@/domains/categorization';
import { useCatalogLabels } from '@/domains/categorization/react';
import type { Cents } from '@/domains/expenses';
import { formatMoney } from '@/shared/i18n/format';
import { DonutChart } from '@/shared/ui/molecules/DonutChart';
import type { CategoryBreakdown as Breakdown } from '../../domain/categoryBreakdown';
import './CategoryBreakdown.scss';

const OTHERS_COLOR = 'var(--category-misc)';

export interface CategoryBreakdownProps {
  breakdown: Breakdown;
  catalog: Catalog;
  /** Total hors logement, affiché au centre du donut. */
  variableSpent: Cents;
}

/** « Où part l'argent » : donut et légende chiffrée (la légende sert aussi d'alternative textuelle). */
export function CategoryBreakdown({ breakdown, catalog, variableSpent }: CategoryBreakdownProps) {
  const { t } = useTranslation('analytics');
  const labels = useCatalogLabels();

  const rows = breakdown.slices.map((slice) => {
    const category = catalog.categories.find((c) => c.id === slice.categoryId);
    return {
      key: slice.categoryId ?? 'others',
      label: category ? labels.category(category) : t('breakdown.others'),
      color: category ? `var(--category-${category.color})` : OTHERS_COLOR,
      amount: slice.amount,
    };
  });

  return (
    <div className="category-breakdown">
      <DonutChart
        label={t('breakdown.ariaLabel')}
        slices={rows.map((row) => ({ value: row.amount, color: row.color }))}
      >
        <span className="category-breakdown__center-label">{t('breakdown.excludingFixed')}</span>
        <span className="category-breakdown__center-amount">
          {formatMoney(variableSpent, { withCents: false })}
        </span>
      </DonutChart>

      <ul className="category-breakdown__legend">
        {rows.map((row) => (
          <li key={row.key} className="category-breakdown__item">
            <span
              className="category-breakdown__dot"
              style={{ '--dot-color': row.color } as CSSProperties}
              aria-hidden="true"
            />
            <span className="category-breakdown__name">{row.label}</span>
            <span className="category-breakdown__amount">
              {formatMoney(row.amount, { withCents: false })}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
