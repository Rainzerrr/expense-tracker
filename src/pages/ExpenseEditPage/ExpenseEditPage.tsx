import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useDeleteWithUndo } from '@/app/useDeleteWithUndo';
import { useToday } from '@/app/useToday';
import { useCatalog, useCreateTag } from '@/domains/categorization/react';
import type { ExpenseId } from '@/domains/expenses';
import { ExpenseForm, expenseToFormValues, toExpenseInput } from '@/domains/expenses/form';
import type { ExpenseFormValues } from '@/domains/expenses/form';
import { useExpense, useUpdateExpense } from '@/domains/expenses/react';
import { SidePanel } from '@/shared/ui/organisms/SidePanel';

export interface ExpenseEditPageProps {
  id: ExpenseId;
  onClose: () => void;
}

/** Panneau de modification, ouvert par-dessus l'historique (voir `useEditExpensePanel`). */
export function ExpenseEditPage({ id, onClose }: ExpenseEditPageProps) {
  const { t } = useTranslation('expenses');
  const today = useToday();
  const expense = useExpense(id);
  const catalog = useCatalog();
  const createTag = useCreateTag();
  const updateExpense = useUpdateExpense();
  const deleteWithUndo = useDeleteWithUndo();

  // La dépense disparaît de la base (supprimée ailleurs, adresse périmée) : on ferme le panneau.
  // `closing` évite un second retour en arrière quand c'est nous qui venons de la supprimer.
  const closing = useRef(false);
  useEffect(() => {
    if (expense === null && !closing.current) onClose();
  }, [expense, onClose]);

  if (!catalog || !expense) return null;

  const close = () => {
    closing.current = true;
    onClose();
  };

  const submit = async (values: ExpenseFormValues) => {
    const result = await updateExpense(id, toExpenseInput(values));
    if (result.ok) close();
    return result;
  };

  const remove = async () => {
    closing.current = true;
    await deleteWithUndo(id);
    onClose();
  };

  return (
    <SidePanel title={t('form.titleEdit')} closeLabel={t('form.close')} onClose={close}>
      <ExpenseForm
        mode="edit"
        catalog={catalog}
        today={today}
        defaultValues={expenseToFormValues(expense)}
        onSubmit={submit}
        onCancel={close}
        onCreateTag={createTag}
        onDelete={() => void remove()}
      />
    </SidePanel>
  );
}
