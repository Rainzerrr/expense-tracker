import * as Toast from '@radix-ui/react-toast';
import { Icon } from '@/shared/ui/atoms/Icon';
import './UndoToast.scss';

const DURATION_MS = 8000;

export interface UndoToastProps {
  /** Absent : rien n'est affiché. */
  toast: { id: number; message: string; actionLabel: string; onAction: () => void } | null;
  dismissLabel: string;
  regionLabel: string;
  onDismiss: () => void;
}

/** Message éphémère avec une action (« Dépense supprimée · Annuler »). Radix gère le survol, F8 et les lecteurs d'écran. */
export function UndoToast({ toast, dismissLabel, regionLabel, onDismiss }: UndoToastProps) {
  return (
    <Toast.Provider duration={DURATION_MS} label={regionLabel} swipeDirection="down">
      {toast && (
        <Toast.Root
          key={toast.id}
          className="undo-toast"
          onOpenChange={(open) => !open && onDismiss()}
        >
          <Toast.Description className="undo-toast__message">{toast.message}</Toast.Description>
          <Toast.Action asChild altText={toast.actionLabel}>
            <button type="button" className="undo-toast__action" onClick={toast.onAction}>
              {toast.actionLabel}
            </button>
          </Toast.Action>
          <Toast.Close className="undo-toast__close" aria-label={dismissLabel}>
            <Icon name="close" size={16} strokeWidth={2.2} />
          </Toast.Close>
        </Toast.Root>
      )}
      <Toast.Viewport className="undo-toast__viewport" />
    </Toast.Provider>
  );
}
