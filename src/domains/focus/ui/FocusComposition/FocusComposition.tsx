import clsx from 'clsx';
import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import type { Catalog } from '@/domains/categorization';
import { useCatalogLabels } from '@/domains/categorization/react';
import { sumCents } from '@/domains/expenses';
import { formatMoney } from '@/shared/i18n/format';
import { CardSection } from '@/shared/ui/molecules/CardSection';
import { SegmentBar } from '@/shared/ui/molecules/SegmentBar';
import type { Segment } from '@/shared/ui/molecules/SegmentBar';
import type { FocusComposition as Composition } from '../../domain/focusStats';
import './FocusComposition.scss';

export interface FocusCompositionProps {
  composition: Composition;
  catalog: Catalog;
  /** Nom du focus (« Viande »), pour légender sa part face au reste de sa catégorie. */
  focusName: string;
  /** Couleur du focus, pour les parts d'une même catégorie. */
  color: string;
}

interface Row {
  key: string;
  label: string;
  amount: number;
  color: string;
  /** Une part pleine attire l'œil, les autres sont estompées. */
  emphasis: boolean;
}

const percentOf = (amount: number, total: number) =>
  total > 0 ? Math.round((amount / total) * 100) : 0;

/**
 * Trois lectures selon ce qu'on suit :
 * - une sous-catégorie : sa part face au reste de sa catégorie (« Dans tes courses ») ;
 * - une catégorie : ses sous-catégories, les plus grosses d'abord ;
 * - un tag : les catégories où il apparaît.
 */
export function FocusComposition({
  composition,
  catalog,
  focusName,
  color,
}: FocusCompositionProps) {
  const { t } = useTranslation('focus');
  const labels = useCatalogLabels();

  let title: string;
  let subtitle: string | undefined;
  let rows: Row[];

  if (composition.kind === 'share-of-parent') {
    const parent = catalog.categories.find((c) => c.id === composition.parentCategoryId);
    const parentName = parent ? labels.category(parent).toLocaleLowerCase('fr') : '';
    const total = composition.focusAmount + composition.restAmount;
    title = t('composition.inParent', { category: parentName });
    subtitle = t('composition.parentTotal', { amount: formatMoney(total, { withCents: false }) });
    rows = [
      { key: 'focus', label: focusName, amount: composition.focusAmount, color, emphasis: true },
      {
        key: 'rest',
        label: t('composition.rest'),
        amount: composition.restAmount,
        color,
        emphasis: false,
      },
    ];
  } else if (composition.kind === 'by-subcategory') {
    title = t('composition.bySubcategory');
    rows = composition.parts.map((part, index) => {
      const sub = catalog.subcategories.find((s) => s.id === part.id);
      return {
        key: part.id ?? 'none',
        label: sub ? labels.subcategory(sub) : t('composition.withoutSubcategory'),
        amount: part.amount,
        color,
        emphasis: index === 0,
      };
    });
  } else {
    title = t('composition.byCategory');
    rows = composition.parts.map((part) => {
      const category = catalog.categories.find((c) => c.id === part.id);
      return {
        key: part.id ?? 'none',
        label: category ? labels.category(category) : '',
        amount: part.amount,
        color: category ? `var(--category-${category.color})` : color,
        emphasis: true,
      };
    });
  }

  if (composition.kind !== 'share-of-parent' && composition.others > 0) {
    rows.push({
      key: 'others',
      label: t('composition.others'),
      amount: composition.others,
      color,
      emphasis: false,
    });
  }

  const total = sumCents(rows.map((row) => row.amount));
  if (total === 0) return null;

  const segments: Segment[] = rows.map((row) => ({
    value: row.amount,
    color: row.color,
    emphasis: row.emphasis,
  }));

  return (
    <CardSection title={title} subtitle={subtitle}>
      <SegmentBar segments={segments} label={t('composition.barLabel')} />
      <ul className="focus-composition__legend">
        {rows.map((row) => (
          <li
            key={row.key}
            className={clsx(
              'focus-composition__item',
              !row.emphasis && 'focus-composition__item--muted',
            )}
            style={{ '--part-color': row.color } as CSSProperties}
          >
            <span className="focus-composition__dot" aria-hidden="true" />
            <span className="focus-composition__label">{row.label}</span>
            <span className="focus-composition__amount">
              {formatMoney(row.amount, { withCents: false })}
            </span>
            <span className="focus-composition__percent">
              {t('composition.percent', { value: percentOf(row.amount, total) })}
            </span>
          </li>
        ))}
      </ul>
    </CardSection>
  );
}
