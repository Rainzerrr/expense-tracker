import { create } from 'zustand';

export interface UndoToast {
  /** Change à chaque affichage : deux suppressions de suite recréent le toast. */
  id: number;
  message: string;
  actionLabel: string;
  onAction: () => void;
}

interface UndoToastStore {
  toast: UndoToast | null;
  show: (toast: Omit<UndoToast, 'id'>) => void;
  dismiss: () => void;
}

let nextId = 1;

/** État éphémère partagé entre écrans : le toast survit à la fermeture du panneau qui l'a déclenché. */
export const useUndoToast = create<UndoToastStore>((set) => ({
  toast: null,
  show: (toast) => set({ toast: { ...toast, id: nextId++ } }),
  dismiss: () => set({ toast: null }),
}));
