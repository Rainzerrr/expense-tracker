import * as Dialog from '@radix-ui/react-dialog';
import type { ReactNode } from 'react';
import { Icon } from '@/shared/ui/atoms/Icon';
import './SidePanel.scss';

export interface SidePanelProps {
  title: string;
  closeLabel: string;
  onClose: () => void;
  children: ReactNode;
}

/**
 * Fenêtre modale : écran plein sur mobile, panneau à droite à partir de 1024 px.
 * Radix gère le focus piégé, la touche Échap et l'inertie du reste de la page.
 */
export function SidePanel({ title, closeLabel, onClose, children }: SidePanelProps) {
  return (
    <Dialog.Root open onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="side-panel__overlay" />
        <Dialog.Content
          className="side-panel"
          aria-describedby={undefined}
          // Le contenu choisit son focus initial (un formulaire vise son premier champ,
          // pas la croix de fermeture, que Radix sélectionnerait par défaut).
          onOpenAutoFocus={(event) => event.preventDefault()}
        >
          <header className="side-panel__header">
            <Dialog.Title className="side-panel__title">{title}</Dialog.Title>
            <Dialog.Close className="side-panel__close" aria-label={closeLabel}>
              <Icon name="close" size={20} strokeWidth={2.2} />
            </Dialog.Close>
          </header>
          <div className="side-panel__body">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
