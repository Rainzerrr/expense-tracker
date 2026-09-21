import { useTranslation } from 'react-i18next';
import type { MouseEvent } from 'react';
import { Button } from '@/shared/ui/atoms/Button';
import { Icon } from '@/shared/ui/atoms/Icon';

// Affichés à titre indicatif : Cmd sur Mac, Ctrl ailleurs fonctionne aussi.
const SHORTCUT_SAVE = '⌘↵';
const SHORTCUT_SAVE_AND_ADD = '⇧⌘↵';

export interface ExpenseFormActionsProps {
  mode: 'create' | 'edit';
  isSubmitting: boolean;
  onCancel: () => void;
  onSaveAndAddAnother: (event: MouseEvent<HTMLButtonElement>) => void;
  onDelete?: () => void;
}

/** Création : Enregistrer / Annuler / Enregistrer et en ajouter une autre. Modification : Enregistrer / Annuler / Supprimer. */
export function ExpenseFormActions({
  mode,
  isSubmitting,
  onCancel,
  onSaveAndAddAnother,
  onDelete,
}: ExpenseFormActionsProps) {
  const { t } = useTranslation('expenses');
  const isEdit = mode === 'edit';

  return (
    <div className="expense-form__actions">
      <Button
        type="submit"
        className="expense-form__save"
        disabled={isSubmitting}
        aria-keyshortcuts="Control+Enter Meta+Enter"
      >
        <Icon name="check" size={20} strokeWidth={2.2} />
        {isEdit ? t('form.actions.saveChanges') : t('form.actions.save')}
        <kbd className="expense-form__shortcut" aria-hidden="true">
          {SHORTCUT_SAVE}
        </kbd>
      </Button>
      <Button variant="secondary" className="expense-form__desktop-only" onClick={onCancel}>
        {t('form.actions.cancel')}
      </Button>
      {isEdit ? (
        onDelete && (
          <Button
            variant="danger"
            className="expense-form__another"
            disabled={isSubmitting}
            onClick={onDelete}
          >
            {t('form.actions.delete')}
          </Button>
        )
      ) : (
        <Button
          variant="secondary"
          className="expense-form__desktop-only expense-form__another"
          disabled={isSubmitting}
          aria-keyshortcuts="Control+Shift+Enter Meta+Shift+Enter"
          onClick={onSaveAndAddAnother}
        >
          {t('form.actions.saveAndAddAnother')}
          <kbd className="expense-form__shortcut" aria-hidden="true">
            {SHORTCUT_SAVE_AND_ADD}
          </kbd>
        </Button>
      )}
    </div>
  );
}
