import clsx from 'clsx';
import type { CSSProperties, ReactNode } from 'react';
import './ChoiceChip.scss';

export interface ChoiceChipProps {
  /** radio : un seul choix dans le groupe. checkbox : plusieurs choix possibles. */
  type: 'radio' | 'checkbox';
  name: string;
  value: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** Permet par exemple de décocher un radio déjà coché. */
  onClick?: () => void;
  label: ReactNode;
  tone: 'category' | 'subcategory' | 'date' | 'tag';
  /** Couleur du point (valeur CSS, ex. `var(--category-groceries)`). Pas de point sans couleur. */
  color?: string;
  /** Icône affichée seulement quand la pastille est choisie. */
  checkedIcon?: ReactNode;
  className?: string;
}

/** Pastille choisissable : un vrai `<input>` natif, donc clavier et lecteur d'écran gratuits. */
export function ChoiceChip({
  type,
  name,
  value,
  checked,
  onChange,
  onClick,
  label,
  tone,
  color,
  checkedIcon,
  className,
}: ChoiceChipProps) {
  const style = color ? ({ '--chip-color': color } as CSSProperties) : undefined;
  return (
    <label className={clsx('choice-chip', `choice-chip--tone-${tone}`, className)} style={style}>
      <input
        className="choice-chip__input"
        type={type}
        name={name}
        value={value}
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        onClick={onClick}
      />
      <span className="choice-chip__body">
        {color && <span className="choice-chip__dot" aria-hidden="true" />}
        {checkedIcon && <span className="choice-chip__icon">{checkedIcon}</span>}
        {label}
      </span>
    </label>
  );
}
