import type { CSSProperties, Ref } from 'react';
import { sanitizeAmountInput } from '../../domain/amountInput';
import { CURRENCY_SYMBOL } from '@/shared/i18n/format';
import { useMediaQuery } from '@/shared/hooks/useMediaQuery';
import { DESKTOP_MEDIA_QUERY } from '@/shared/lib/breakpoints';
import './AmountField.scss';

export interface AmountFieldProps {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  /** Le champ est activé : focus au clavier ou toucher (le champ peut déjà avoir le focus). */
  onActivate?: () => void;
  inputRef?: Ref<HTMLInputElement>;
  error?: string;
}

export function AmountField({
  id,
  label,
  placeholder,
  value,
  onChange,
  onBlur,
  onActivate,
  inputRef,
  error,
}: AmountFieldProps) {
  // Sur mobile le pavé numérique de l'application remplace le clavier du système.
  const isDesktop = useMediaQuery(DESKTOP_MEDIA_QUERY);
  const errorId = `${id}-error`;
  // Largeur de repli (navigateurs sans `field-sizing`) : une virgule est plus étroite qu'un chiffre.
  const commaWidth = value.includes(',') ? 0.4 : 0;
  const chars = Math.max(value.replace(',', '').length + commaWidth, placeholder.length);

  return (
    <div className="amount-field">
      <label className="amount-field__label" htmlFor={id}>
        {label}
      </label>
      <div className="amount-field__box">
        <input
          ref={inputRef}
          id={id}
          className="amount-field__input"
          type="text"
          inputMode={isDesktop ? 'decimal' : 'none'}
          autoComplete="off"
          placeholder={placeholder}
          value={value}
          onChange={(event) => onChange(sanitizeAmountInput(event.target.value))}
          onBlur={onBlur}
          onFocus={onActivate}
          onClick={onActivate}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          style={{ '--amount-chars': chars } as CSSProperties}
        />
        <span className="amount-field__currency" aria-hidden="true">
          {CURRENCY_SYMBOL}
        </span>
      </div>
      {error && (
        <p id={errorId} className="amount-field__error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
