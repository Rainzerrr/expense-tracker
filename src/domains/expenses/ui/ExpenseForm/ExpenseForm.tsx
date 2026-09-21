import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useId, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import type { FieldPath, FieldPathValue } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import type { Catalog, Tag } from '@/domains/categorization';
import { useCatalogLabels } from '@/domains/categorization/react';
import { formatMoney } from '@/shared/i18n/format';
import type { LocalDate } from '@/shared/lib/time';
import { applyKeypadKey } from '../../domain/amountInput';
import type { ExpenseResult } from '../../domain/expense';
import { AmountField } from '../AmountField';
import { AmountKeypad } from '../AmountKeypad';
import { CategoryPicker } from '../CategoryPicker';
import { DateQuickPicker } from '../DateQuickPicker';
import { SubcategoryPicker } from '../SubcategoryPicker';
import { TagPicker } from '../TagPicker';
import { ExpenseFormActions } from './ExpenseFormActions';
import { expenseFormSchema } from './expenseFormSchema';
import type { ExpenseFormValues, FormErrorKey } from './expenseFormSchema';
import './ExpenseForm.scss';

export interface ExpenseFormProps {
  catalog: Catalog;
  /** Le jour courant : préremplit la date et alimente « Aujourd'hui » / « Hier ». */
  today: LocalDate;
  onSubmit: (values: ExpenseFormValues, options: { addAnother: boolean }) => Promise<ExpenseResult>;
  onCancel: () => void;
  onCreateTag: (name: string) => Promise<Tag | null>;
  /** `create` (par défaut) ou `edit` : la modification préremplit les champs et propose « Supprimer ». */
  mode?: 'create' | 'edit';
  defaultValues?: ExpenseFormValues;
  onDelete?: () => void;
}

type Status = { kind: 'saved'; amount: string } | { kind: 'error' } | null;

export function ExpenseForm({
  catalog,
  today,
  onSubmit,
  onCancel,
  onCreateTag,
  mode = 'create',
  defaultValues,
  onDelete,
}: ExpenseFormProps) {
  const { t } = useTranslation('expenses');
  const labels = useCatalogLabels();
  const idPrefix = useId();
  const amountInput = useRef<HTMLInputElement | null>(null);
  const [status, setStatus] = useState<Status>(null);
  // Saisie : le pavé est toujours là. Modification (mobile) : il masquerait la date et les tags,
  // on ne l'ouvre que quand on touche le montant.
  const [keypadOpen, setKeypadOpen] = useState(mode === 'create');

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting, isSubmitted },
  } = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: defaultValues ?? {
      amount: '',
      categoryId: '',
      subcategoryId: null,
      date: today,
      tagIds: [],
    },
  });

  // Le montant prend le focus à l'ouverture (les raccourcis ⌘↵ marchent tout de suite).
  // En modification ce focus initial n'ouvre pas le pavé : seul un toucher explicite le fait.
  const initialFocus = useRef(false);
  useEffect(() => {
    initialFocus.current = true;
    amountInput.current?.focus();
    initialFocus.current = false;
  }, []);

  // `defaultValues` renseigne chaque champ : useWatch le type quand même comme partiel.
  const values = useWatch({ control }) as ExpenseFormValues;
  const errorText = (message?: string) => (message ? t(message as FormErrorKey) : undefined);
  // Après une première tentative d'enregistrement, on revalide à chaque changement.
  const set = <P extends FieldPath<ExpenseFormValues>>(
    field: P,
    value: FieldPathValue<ExpenseFormValues, P>,
  ) => setValue(field, value, { shouldValidate: isSubmitted });

  const subcategories = catalog.subcategories.filter((sub) => sub.categoryId === values.categoryId);
  const category = catalog.categories.find((c) => c.id === values.categoryId);
  const subcategory = subcategories.find((sub) => sub.id === values.subcategoryId);

  const save = (addAnother: boolean) =>
    handleSubmit(async (submitted) => {
      setStatus(null);
      const result = await onSubmit(submitted, { addAnother });
      if (!result.ok) {
        setStatus({ kind: 'error' });
        return;
      }
      if (addAnother) {
        // On garde catégorie et date (saisie en série), on efface le reste.
        reset({ ...submitted, amount: '', tagIds: [] });
        setStatus({ kind: 'saved', amount: formatMoney(result.expense.amount) });
        amountInput.current?.focus();
      }
    });

  const handleKeyDown = (event: KeyboardEvent<HTMLFormElement>) => {
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      void save(mode === 'create' && event.shiftKey)(event);
    }
  };

  return (
    // Les raccourcis ⌘↵ écoutent les touches qui remontent des champs du formulaire.
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
    <form
      className="expense-form"
      noValidate
      onSubmit={(event) => void save(false)(event)}
      onKeyDown={handleKeyDown}
    >
      {/* En modification, toucher un autre champ que le montant referme le pavé. */}
      <div
        className="expense-form__body"
        onFocus={(event) => {
          if (mode === 'edit' && event.target !== amountInput.current) setKeypadOpen(false);
        }}
      >
        <Controller
          control={control}
          name="amount"
          render={({ field }) => (
            <AmountField
              id={`${idPrefix}-amount`}
              label={t('form.amount.label')}
              placeholder={t('form.amount.placeholder')}
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              onActivate={() => !initialFocus.current && setKeypadOpen(true)}
              inputRef={(element) => {
                field.ref(element);
                amountInput.current = element;
              }}
              error={errorText(errors.amount?.message)}
            />
          )}
        />

        {category && (
          <p
            className="expense-form__summary"
            style={{ '--summary-color': `var(--category-${category.color})` } as CSSProperties}
          >
            <span className="expense-form__summary-dot" aria-hidden="true" />
            {subcategory
              ? t('form.summary.withSubcategory', {
                  category: labels.category(category),
                  subcategory: labels.subcategory(subcategory),
                })
              : t('form.summary.categoryOnly', { category: labels.category(category) })}
          </p>
        )}

        <CategoryPicker
          legend={t('form.category.label')}
          categories={catalog.categories}
          value={values.categoryId}
          onChange={(categoryId) => {
            set('categoryId', categoryId);
            // La sous-catégorie appartient à une catégorie : on repart de zéro.
            setValue('subcategoryId', null);
          }}
          getLabel={labels.category}
          error={errorText(errors.categoryId?.message)}
        />

        {subcategories.length > 0 && (
          <SubcategoryPicker
            legend={t('form.subcategory.label')}
            subcategories={subcategories}
            value={values.subcategoryId}
            onChange={(subcategoryId) => set('subcategoryId', subcategoryId)}
            getLabel={labels.subcategory}
          />
        )}

        <DateQuickPicker
          legend={t('form.date.label')}
          todayLabel={t('form.date.today')}
          yesterdayLabel={t('form.date.yesterday')}
          otherLabel={t('form.date.other')}
          dateInputLabel={t('form.date.input')}
          today={today}
          value={values.date}
          onChange={(date) => set('date', date)}
          error={errorText(errors.date?.message)}
        />

        <TagPicker
          legend={t('form.tags.label')}
          addLabel={t('form.tags.add')}
          newTagLabel={t('form.tags.newTag')}
          tags={catalog.tags}
          selectedIds={values.tagIds}
          onChange={(tagIds) => set('tagIds', tagIds)}
          getLabel={labels.tag}
          onCreate={onCreateTag}
        />
      </div>

      <div className="expense-form__footer">
        {keypadOpen && (
          <AmountKeypad
            label={t('form.keypad.label')}
            commaLabel={t('form.keypad.comma')}
            backspaceLabel={t('form.keypad.backspace')}
            onKey={(key) => set('amount', applyKeypadKey(values.amount, key))}
          />
        )}

        <p className="expense-form__status" role="status">
          {status?.kind === 'saved' && t('form.saved', { amount: status.amount })}
        </p>
        {status?.kind === 'error' && (
          <p className="expense-form__error" role="alert">
            {t('form.errors.save')}
          </p>
        )}

        <ExpenseFormActions
          mode={mode}
          isSubmitting={isSubmitting}
          onCancel={onCancel}
          onSaveAndAddAnother={(event) => void save(true)(event)}
          onDelete={onDelete}
        />
      </div>
    </form>
  );
}
