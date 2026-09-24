import clsx from 'clsx';
import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import type { To } from 'react-router-dom';
import { Icon } from '@/shared/ui/atoms/Icon';
import type { IconName } from '@/shared/ui/atoms/Icon';

/** Cellule « Tag » vide du tableau. */
const EMPTY_CELL = '—';

export interface ExpenseListRowProps {
  icon: IconName;
  /** Valeur CSS de la couleur de la catégorie. */
  color: string;
  /** Sous-catégorie si elle existe, sinon catégorie. */
  label: string;
  categoryLabel: string;
  /** Le commerçant d'une dépense importée : « Continente ». */
  note?: string;
  /** Déjà préfixés : « #avec-amis ». */
  tags: string[];
  /** Déjà formaté : « −12,40 € ». */
  amount: string;
  /** « dim. 20 sept. » : visible seulement dans le tableau (grand écran). */
  dateLabel: string;
  selected: boolean;
  editTo: To;
  editState: unknown;
  editLabel: string;
  swipeEditLabel: string;
  swipeDeleteLabel: string;
  onDelete: () => void;
}

/**
 * Une dépense. Le lien principal ouvre la modification (c'est l'alternative visible au
 * glissement). Sur mobile, glisser la ligne vers la gauche révèle « Modifier » et « Supprimer ».
 */
export function ExpenseListRow({
  icon,
  color,
  label,
  categoryLabel,
  note,
  tags,
  amount,
  dateLabel,
  selected,
  editTo,
  editState,
  editLabel,
  swipeEditLabel,
  swipeDeleteLabel,
  onDelete,
}: ExpenseListRowProps) {
  return (
    <div
      className={clsx('expense-list-row', selected && 'expense-list-row--selected')}
      style={{ '--row-color': color } as CSSProperties}
    >
      <div className="expense-list-row__swipe">
        <Link className="expense-list-row__main" to={editTo} state={editState}>
          <span className="expense-list-row__date">{dateLabel}</span>
          <span className="expense-list-row__icon" aria-hidden="true">
            <Icon name={icon} size={20} />
          </span>
          <span className="expense-list-row__body">
            <span className="expense-list-row__label">
              <span className="expense-list-row__dot" aria-hidden="true" />
              <span className="u-visually-hidden">{editLabel} </span>
              {label}
            </span>
            <span className="expense-list-row__meta">
              <span className="expense-list-row__category">
                {note ? `${note} · ${categoryLabel}` : categoryLabel}
              </span>
              {tags.length === 0 && (
                <span className="expense-list-row__no-tag" aria-hidden="true">
                  {EMPTY_CELL}
                </span>
              )}
              {tags.length > 0 && (
                <span className="expense-list-row__tags">
                  {tags.map((tag) => (
                    <span key={tag} className="expense-list-row__tag">
                      {tag}
                    </span>
                  ))}
                </span>
              )}
            </span>
          </span>
          <span className="expense-list-row__amount">{amount}</span>
        </Link>

        <div className="expense-list-row__actions">
          <Link
            className="expense-list-row__action expense-list-row__action--edit"
            to={editTo}
            state={editState}
          >
            <Icon name="pencil" size={18} />
            {swipeEditLabel}
          </Link>
          <button
            type="button"
            className="expense-list-row__action expense-list-row__action--delete"
            onClick={onDelete}
          >
            <Icon name="trash" size={18} />
            {swipeDeleteLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
