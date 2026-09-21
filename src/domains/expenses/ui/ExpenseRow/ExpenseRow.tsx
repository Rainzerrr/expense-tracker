import type { CSSProperties } from 'react';
import { Icon } from '@/shared/ui/atoms/Icon';
import type { IconName } from '@/shared/ui/atoms/Icon';
import './ExpenseRow.scss';

export interface ExpenseRowProps {
  icon: IconName;
  /** Valeur CSS de la couleur de la catégorie, ex. `var(--category-groceries)`. */
  color: string;
  /** Sous-catégorie si elle existe, sinon catégorie. */
  label: string;
  /** « Courses · Aujourd'hui » */
  meta: string;
  /** Déjà formaté : « −12,40 € ». */
  amount: string;
}

export function ExpenseRow({ icon, color, label, meta, amount }: ExpenseRowProps) {
  return (
    <div className="expense-row" style={{ '--row-color': color } as CSSProperties}>
      <span className="expense-row__icon" aria-hidden="true">
        <Icon name={icon} size={20} />
      </span>
      <span className="expense-row__body">
        <span className="expense-row__label">{label}</span>
        <span className="expense-row__meta">{meta}</span>
      </span>
      <span className="expense-row__amount">{amount}</span>
    </div>
  );
}
