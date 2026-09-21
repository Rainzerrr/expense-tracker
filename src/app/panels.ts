import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { To } from 'react-router-dom';
import type { ExpenseId } from '@/domains/expenses';

const NEW_PARAM = 'new';
const EDIT_PARAM = 'edit';
const FOCUS_PARAM = 'focus';
const OPENED_BY_APP = { panelOpenedByApp: true } as const;

/**
 * Un panneau (saisie, modification) est un état de l'adresse, pas une page : la page en dessous
 * (dashboard, historique) reste affichée derrière lui sur grand écran, et le bouton retour le ferme.
 */
function usePanelParam(param: string) {
  const location = useLocation();
  const navigate = useNavigate();
  const value = new URLSearchParams(location.search).get(param);

  // Même page, mêmes paramètres (ex. ?month=), plus celui du panneau.
  const toWith = (panelValue: string): To => {
    const params = new URLSearchParams(location.search);
    params.set(param, panelValue);
    return { pathname: location.pathname, search: `?${params.toString()}` };
  };

  const openedByApp = (location.state as { panelOpenedByApp?: boolean } | null)?.panelOpenedByApp;
  const close = useCallback(() => {
    if (openedByApp) {
      navigate(-1);
      return;
    }
    // Ouvert par une adresse directe : il n'y a pas d'entrée précédente, on retire le paramètre.
    const params = new URLSearchParams(location.search);
    params.delete(param);
    const search = params.toString();
    navigate(
      { pathname: location.pathname, search: search ? `?${search}` : '' },
      { replace: true },
    );
  }, [openedByApp, location.pathname, location.search, param, navigate]);

  return { value, toWith, close };
}

/** Panneau « Nouvelle dépense » : `?new=1`. */
export function useNewExpensePanel() {
  const { value, toWith, close } = usePanelParam(NEW_PARAM);
  return { isOpen: value === '1', openTo: toWith('1'), openState: OPENED_BY_APP, close };
}

/** Panneau « Modifier la dépense » : `?edit=<identifiant>`. */
export function useEditExpensePanel() {
  const { value, toWith, close } = usePanelParam(EDIT_PARAM);
  return {
    expenseId: value ? (value as ExpenseId) : null,
    editTo: (id: ExpenseId) => toWith(id),
    openState: OPENED_BY_APP,
    close,
  };
}

/** Panneau « Mes focus » (épingler, retirer, réordonner) : `?focus=manage`. */
export function useFocusManagerPanel() {
  const { value, toWith, close } = usePanelParam(FOCUS_PARAM);
  return { isOpen: value === 'manage', openTo: toWith('manage'), openState: OPENED_BY_APP, close };
}
