import { useId, useState } from 'react';
import type { FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { formatAmountInput, parseEuroInput, sanitizeAmountInput } from '@/domains/expenses';
import type { Cents } from '@/domains/expenses';
import { CURRENCY_SYMBOL } from '@/shared/i18n/format';
import { Button } from '@/shared/ui/atoms/Button';
import { CardSection } from '@/shared/ui/molecules/CardSection';
import type { Budget } from '../../domain/budget';
import './BudgetSettingsForm.scss';

export interface BudgetSettingsFormProps {
  budget: Budget;
  onSave: (values: {
    housingCents: Cents;
    flexCents: Cents;
    totalCents: Cents;
  }) => Promise<unknown>;
}

interface FieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}

function AmountField({ id, label, value, onChange }: FieldProps) {
  return (
    <label className="budget-settings-form__field" htmlFor={id}>
      <span className="budget-settings-form__label">{label}</span>
      <span className="budget-settings-form__box">
        <input
          id={id}
          className="budget-settings-form__input"
          type="text"
          inputMode="decimal"
          value={value}
          onChange={(event) => onChange(sanitizeAmountInput(event.target.value))}
        />
        <span aria-hidden="true">{CURRENCY_SYMBOL}</span>
      </span>
    </label>
  );
}

/**
 * Réglage des trois montants du budget mensuel : logement, courses + activités, total du mois.
 * `budget` est requis (pas optionnel) : c'est à l'appelant d'attendre qu'il soit chargé avant de
 * monter ce formulaire, pour que les champs partent des bonnes valeurs (voir `BudgetSettingsCard`).
 */
export function BudgetSettingsForm({ budget, onSave }: BudgetSettingsFormProps) {
  const { t } = useTranslation('settings');
  const idPrefix = useId();
  const [housing, setHousing] = useState(() => formatAmountInput(budget.housingCents));
  const [flex, setFlex] = useState(() => formatAmountInput(budget.flexCents));
  const [total, setTotal] = useState(() => formatAmountInput(budget.totalCents));
  const [status, setStatus] = useState<'idle' | 'saved' | 'error'>('idle');

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const housingCents = parseEuroInput(housing);
    const flexCents = parseEuroInput(flex);
    const totalCents = parseEuroInput(total);
    if (housingCents === null || flexCents === null || totalCents === null) {
      setStatus('error');
      return;
    }
    await onSave({ housingCents, flexCents, totalCents });
    setStatus('saved');
  };

  return (
    <CardSection title={t('budget.title')}>
      <p className="budget-settings-form__text">{t('budget.text')}</p>
      <form className="budget-settings-form" onSubmit={(event) => void submit(event)}>
        <AmountField
          id={`${idPrefix}-housing`}
          label={t('budget.housing.label')}
          value={housing}
          onChange={(v) => {
            setHousing(v);
            setStatus('idle');
          }}
        />
        <AmountField
          id={`${idPrefix}-flex`}
          label={t('budget.flex.label')}
          value={flex}
          onChange={(v) => {
            setFlex(v);
            setStatus('idle');
          }}
        />
        <AmountField
          id={`${idPrefix}-total`}
          label={t('budget.total.label')}
          value={total}
          onChange={(v) => {
            setTotal(v);
            setStatus('idle');
          }}
        />
        <div className="budget-settings-form__actions">
          <Button type="submit">{t('budget.save')}</Button>
          <p role="status" className="budget-settings-form__status">
            {status === 'saved' && t('budget.saved')}
          </p>
          {status === 'error' && (
            <p role="alert" className="budget-settings-form__error">
              {t('budget.error')}
            </p>
          )}
        </div>
      </form>
    </CardSection>
  );
}
