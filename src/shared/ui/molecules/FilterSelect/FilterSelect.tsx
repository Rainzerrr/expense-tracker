import clsx from 'clsx';
import { Icon } from '@/shared/ui/atoms/Icon';
import './FilterSelect.scss';

export interface FilterOption {
  value: string;
  label: string;
}

export interface FilterSelectProps {
  /** Nom lu par les lecteurs d'écran (« Catégorie »). */
  label: string;
  value: string;
  options: FilterOption[];
  /** Libellé de l'option « aucun filtre ». Absent : la liste n'a pas d'option vide (ex. le mois). */
  emptyLabel?: string;
  onChange: (value: string) => void;
  /** `strong` : pastille sombre, pour le choix principal (le mois). */
  tone?: 'default' | 'strong';
}

/**
 * Pastille de filtre. C'est un vrai `<select>` (transparent, par-dessus la pastille) : les
 * sélecteurs natifs d'iOS et de macOS, le clavier et les lecteurs d'écran fonctionnent sans code.
 */
export function FilterSelect({
  label,
  value,
  options,
  emptyLabel,
  onChange,
  tone = 'default',
}: FilterSelectProps) {
  const selected = options.find((option) => option.value === value);
  const isActive = tone === 'default' && value !== '';

  return (
    <label
      className={clsx(
        'filter-select',
        `filter-select--tone-${tone}`,
        isActive && 'filter-select--active',
      )}
    >
      <select
        className="filter-select__native"
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {emptyLabel !== undefined && <option value="">{emptyLabel}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <span className="filter-select__face" aria-hidden="true">
        {selected?.label ?? emptyLabel ?? label}
        <Icon name="chevronDown" size={16} strokeWidth={2.2} />
      </span>
    </label>
  );
}
