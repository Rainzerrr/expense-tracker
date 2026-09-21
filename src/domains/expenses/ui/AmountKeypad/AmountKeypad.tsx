import { Icon } from '@/shared/ui/atoms/Icon';
import type { AmountKey } from '../../domain/amountInput';
import './AmountKeypad.scss';

const KEYS: AmountKey[] = ['1', '2', '3', '4', '5', '6', '7', '8', '9', ',', '0', 'backspace'];

export interface AmountKeypadProps {
  label: string;
  commaLabel: string;
  backspaceLabel: string;
  onKey: (key: AmountKey) => void;
}

/** Pavé numérique intégré (mobile). Masqué sur grand écran, où l'on tape au clavier. */
export function AmountKeypad({ label, commaLabel, backspaceLabel, onKey }: AmountKeypadProps) {
  return (
    <div className="amount-keypad" role="group" aria-label={label}>
      {KEYS.map((key) => (
        <button
          key={key}
          type="button"
          className={
            key === 'backspace'
              ? 'amount-keypad__key amount-keypad__key--action'
              : 'amount-keypad__key'
          }
          aria-label={key === ',' ? commaLabel : key === 'backspace' ? backspaceLabel : undefined}
          onClick={() => onKey(key)}
        >
          {key === 'backspace' ? <Icon name="backspace" size={24} /> : key}
        </button>
      ))}
    </div>
  );
}
