import { useTranslation } from 'react-i18next';
import { useCatalog } from '@/domains/categorization/react';
import { FocusManager, useFocusActions, useFocuses } from '@/domains/focus/manager';
import { SidePanel } from '@/shared/ui/organisms/SidePanel';

export interface FocusManagerPageProps {
  onClose: () => void;
}

/** Panneau « Mes focus », ouvert par-dessus la page courante (voir `useFocusManagerPanel`). */
export function FocusManagerPage({ onClose }: FocusManagerPageProps) {
  const { t } = useTranslation('focus');
  const { t: tExpenses } = useTranslation('expenses');
  const focuses = useFocuses();
  const catalog = useCatalog();
  const actions = useFocusActions();

  if (!focuses || !catalog) return null;

  return (
    <SidePanel title={t('manager.title')} closeLabel={tExpenses('form.close')} onClose={onClose}>
      <FocusManager
        focuses={focuses}
        catalog={catalog}
        onAdd={actions.add}
        onRemove={actions.remove}
        onMove={actions.move}
        onDone={onClose}
      />
    </SidePanel>
  );
}
