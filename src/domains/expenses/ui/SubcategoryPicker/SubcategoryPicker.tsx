import { useId } from 'react';
import type { Subcategory } from '@/domains/categorization';
import { ChoiceChip } from '@/shared/ui/atoms/ChoiceChip';
import './SubcategoryPicker.scss';

export interface SubcategoryPickerProps {
  legend: string;
  subcategories: Subcategory[];
  /** null : aucune sous-catégorie (elle est facultative). */
  value: string | null;
  onChange: (subcategoryId: string | null) => void;
  getLabel: (subcategory: Subcategory) => string;
}

export function SubcategoryPicker({
  legend,
  subcategories,
  value,
  onChange,
  getLabel,
}: SubcategoryPickerProps) {
  const name = useId();
  return (
    <fieldset className="subcategory-picker">
      <legend className="subcategory-picker__legend">{legend}</legend>
      <div className="subcategory-picker__options">
        {subcategories.map((sub) => (
          <ChoiceChip
            key={sub.id}
            type="radio"
            name={name}
            value={sub.id}
            checked={value === sub.id}
            onChange={() => onChange(sub.id)}
            // Un second appui sur la pastille choisie retire la sous-catégorie.
            onClick={() => value === sub.id && onChange(null)}
            label={getLabel(sub)}
            tone="subcategory"
          />
        ))}
      </div>
    </fieldset>
  );
}
