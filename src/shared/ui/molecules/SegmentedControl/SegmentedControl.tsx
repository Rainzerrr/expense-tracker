import { useId } from 'react';
import './SegmentedControl.scss';

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

export interface SegmentedControlProps<T extends string> {
  /** Nom du groupe, lu par les lecteurs d'écran. */
  label: string;
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
}

/** Un choix parmi quelques-uns. Des boutons radio natifs : flèches du clavier et lecteurs d'écran inclus. */
export function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onChange,
}: SegmentedControlProps<T>) {
  const name = useId();
  return (
    <div className="segmented-control" role="radiogroup" aria-label={label}>
      {options.map((option) => (
        <label key={option.value} className="segmented-control__option">
          <input
            className="segmented-control__input"
            type="radio"
            name={name}
            value={option.value}
            checked={option.value === value}
            onChange={() => onChange(option.value)}
          />
          <span className="segmented-control__face">{option.label}</span>
        </label>
      ))}
    </div>
  );
}
