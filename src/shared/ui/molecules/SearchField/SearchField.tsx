import { Icon } from '@/shared/ui/atoms/Icon';
import './SearchField.scss';

export interface SearchFieldProps {
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
}

export function SearchField({ label, placeholder, value, onChange }: SearchFieldProps) {
  return (
    <div className="search-field">
      <span className="search-field__icon" aria-hidden="true">
        <Icon name="search" size={20} />
      </span>
      <input
        className="search-field__input"
        type="search"
        aria-label={label}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        enterKeyHint="search"
        autoComplete="off"
        autoCapitalize="none"
        spellCheck={false}
      />
    </div>
  );
}
