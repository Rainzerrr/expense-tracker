import { useId } from 'react';
import type { Category } from '@/domains/categorization';
import { ChoiceChip } from '@/shared/ui/atoms/ChoiceChip';
import './CategoryPicker.scss';

export interface CategoryPickerProps {
  legend: string;
  categories: Category[];
  value: string;
  onChange: (categoryId: string) => void;
  getLabel: (category: Category) => string;
  error?: string;
}

export function CategoryPicker({
  legend,
  categories,
  value,
  onChange,
  getLabel,
  error,
}: CategoryPickerProps) {
  const name = useId();
  return (
    <fieldset className="category-picker" aria-invalid={error ? true : undefined}>
      <legend className="category-picker__legend">{legend}</legend>
      <div className="category-picker__options">
        {categories.map((category) => (
          <ChoiceChip
            key={category.id}
            className="category-picker__chip"
            type="radio"
            name={name}
            value={category.id}
            checked={value === category.id}
            onChange={() => onChange(category.id)}
            label={getLabel(category)}
            tone="category"
            color={`var(--category-${category.color})`}
          />
        ))}
      </div>
      {error && (
        <p className="category-picker__error" role="alert">
          {error}
        </p>
      )}
    </fieldset>
  );
}
