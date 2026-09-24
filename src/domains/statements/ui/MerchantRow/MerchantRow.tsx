import clsx from 'clsx';
import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import type { Catalog } from '@/domains/categorization';
import { useCatalogLabels } from '@/domains/categorization/react';
import { formatMoney } from '@/shared/i18n/format';
import type { MerchantGroup, MerchantChoice } from '../../domain/importPlan';
import { choiceToValue, SKIP_VALUE, UNRESOLVED_VALUE, valueToChoice } from './choiceValue';
import './MerchantRow.scss';

export interface MerchantRowProps {
  group: MerchantGroup;
  choice: MerchantChoice | undefined;
  catalog: Catalog;
  onChange: (choice: MerchantChoice | undefined) => void;
}

/** Un commerçant du relevé, avec la catégorie proposée (à corriger) ou « À classer ». */
export function MerchantRow({ group, choice, catalog, onChange }: MerchantRowProps) {
  const { t } = useTranslation('settings');
  const labels = useCatalogLabels();
  const selectId = useId();
  const unresolved = choice === undefined;

  const parentOf = (id: string) => catalog.subcategories.find((s) => s.id === id)?.categoryId;

  return (
    <li className={clsx('merchant-row', unresolved && 'merchant-row--unresolved')}>
      <div className="merchant-row__info">
        <span className="merchant-row__name">{group.label}</span>
        <span className="merchant-row__meta">
          {t('statement.preview.purchases', { count: group.candidates.length })} ·{' '}
          <span className="merchant-row__total">{formatMoney(group.total)}</span>
          {unresolved && (
            <span className="merchant-row__badge">{t('statement.preview.toClassifyBadge')}</span>
          )}
        </span>
      </div>
      <select
        id={selectId}
        className="merchant-row__select"
        aria-label={t('statement.preview.merchantCategory', { merchant: group.label })}
        value={choiceToValue(choice)}
        onChange={(event) => onChange(valueToChoice(event.target.value, parentOf))}
      >
        <option value={UNRESOLVED_VALUE} disabled={!unresolved}>
          {t('statement.preview.choose')}
        </option>
        <option value={SKIP_VALUE}>{t('statement.preview.skip')}</option>
        {catalog.categories.map((category) => (
          <optgroup key={category.id} label={labels.category(category)}>
            <option value={`c:${category.id}`}>
              {t('statement.preview.categoryOnly', { category: labels.category(category) })}
            </option>
            {catalog.subcategories
              .filter((sub) => sub.categoryId === category.id)
              .map((sub) => (
                // Le sélecteur fermé n'affiche que le texte de l'option : la catégorie doit y figurer
                // (« Autre » existe dans Shopping et dans Divers).
                <option key={sub.id} value={`s:${sub.id}`}>
                  {labels.category(category)} › {labels.subcategory(sub)}
                </option>
              ))}
          </optgroup>
        ))}
      </select>
    </li>
  );
}
