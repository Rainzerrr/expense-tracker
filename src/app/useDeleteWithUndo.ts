import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import type { ExpenseId } from '@/domains/expenses';
import { useDeleteExpense, useRestoreExpense } from '@/domains/expenses/react';
import { useUndoToast } from './undoToast';

/** Supprime une dépense et propose « Annuler » dans un toast. */
export function useDeleteWithUndo() {
  const { t } = useTranslation('expenses');
  const deleteExpense = useDeleteExpense();
  const restoreExpense = useRestoreExpense();
  const show = useUndoToast((state) => state.show);

  return useCallback(
    async (id: ExpenseId) => {
      await deleteExpense(id);
      show({
        message: t('toast.deleted'),
        actionLabel: t('toast.undo'),
        onAction: () => void restoreExpense(id),
      });
    },
    [deleteExpense, restoreExpense, show, t],
  );
}
