import { useTranslation } from 'react-i18next';
import { useToday } from '@/app/useToday';
import { useCatalog, useCreateTag } from '@/domains/categorization/react';
import { ExpenseForm, toExpenseInput } from '@/domains/expenses/form';
import type { ExpenseFormValues } from '@/domains/expenses/form';
import { useAddExpense } from '@/domains/expenses/react';
import { SidePanel } from '@/shared/ui/organisms/SidePanel';

export interface ExpenseCreatePageProps {
  onClose: () => void;
}

/** Panneau de saisie, ouvert par-dessus la page courante (voir `useNewExpensePanel`). */
export function ExpenseCreatePage({ onClose }: ExpenseCreatePageProps) {
  const { t } = useTranslation('expenses');
  const today = useToday();
  const catalog = useCatalog();
  const createTag = useCreateTag();
  const addExpense = useAddExpense();

  // Le catalogue se charge en quelques millisecondes depuis la base locale.
  if (!catalog) return null;

  const submit = async (values: ExpenseFormValues, { addAnother }: { addAnother: boolean }) => {
    const result = await addExpense(toExpenseInput(values));
    if (result.ok && !addAnother) onClose();
    return result;
  };

  return (
    <SidePanel title={t('form.titleCreate')} closeLabel={t('form.close')} onClose={onClose}>
      <ExpenseForm
        catalog={catalog}
        today={today}
        onSubmit={submit}
        onCancel={onClose}
        onCreateTag={createTag}
      />
    </SidePanel>
  );
}
