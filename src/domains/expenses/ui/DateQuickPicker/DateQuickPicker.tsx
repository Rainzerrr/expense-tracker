import { useId, useState } from 'react';
import { addDays } from '@/shared/lib/time';
import type { LocalDate } from '@/shared/lib/time';
import { Icon } from '@/shared/ui/atoms/Icon';
import { ChoiceChip } from '@/shared/ui/atoms/ChoiceChip';
import './DateQuickPicker.scss';

type Preset = 'today' | 'yesterday' | 'other';

export interface DateQuickPickerProps {
  legend: string;
  todayLabel: string;
  yesterdayLabel: string;
  otherLabel: string;
  dateInputLabel: string;
  today: LocalDate;
  value: string;
  onChange: (date: string) => void;
  error?: string;
}

/** Aujourd'hui / Hier en un geste ; toute autre date passe par le sélecteur natif du système. */
export function DateQuickPicker({
  legend,
  todayLabel,
  yesterdayLabel,
  otherLabel,
  dateInputLabel,
  today,
  value,
  onChange,
  error,
}: DateQuickPickerProps) {
  const name = useId();
  const [pickingOther, setPickingOther] = useState(false);

  const yesterday = addDays(today, -1);
  const preset: Preset = pickingOther
    ? 'other'
    : value === today
      ? 'today'
      : value === yesterday
        ? 'yesterday'
        : 'other';

  const choose = (next: Preset) => {
    setPickingOther(next === 'other');
    if (next === 'today') onChange(today);
    if (next === 'yesterday') onChange(yesterday);
  };

  return (
    <fieldset className="date-quick-picker">
      <legend className="date-quick-picker__legend">{legend}</legend>
      <div className="date-quick-picker__options">
        {/* Sur grand écran, le champ date est toujours visible, avant les raccourcis. */}
        <input
          className={
            preset === 'other'
              ? 'date-quick-picker__input date-quick-picker__input--visible'
              : 'date-quick-picker__input'
          }
          type="date"
          aria-label={dateInputLabel}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-invalid={error ? true : undefined}
        />
        <ChoiceChip
          type="radio"
          name={name}
          value="today"
          checked={preset === 'today'}
          onChange={() => choose('today')}
          label={todayLabel}
          tone="date"
          checkedIcon={<Icon name="calendar" size={18} />}
        />
        <ChoiceChip
          type="radio"
          name={name}
          value="yesterday"
          checked={preset === 'yesterday'}
          onChange={() => choose('yesterday')}
          label={yesterdayLabel}
          tone="date"
        />
        <ChoiceChip
          className="date-quick-picker__other"
          type="radio"
          name={name}
          value="other"
          checked={preset === 'other'}
          onChange={() => choose('other')}
          label={otherLabel}
          tone="date"
        />
      </div>
      {error && (
        <p className="date-quick-picker__error" role="alert">
          {error}
        </p>
      )}
    </fieldset>
  );
}
