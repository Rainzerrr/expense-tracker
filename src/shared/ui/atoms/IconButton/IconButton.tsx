import type { ButtonHTMLAttributes } from 'react';
import { Icon } from '@/shared/ui/atoms/Icon';
import type { IconName } from '@/shared/ui/atoms/Icon';
import './IconButton.scss';

export interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  icon: IconName;
  /** Obligatoire : un bouton sans texte visible a besoin d'un nom pour les lecteurs d'écran. */
  label: string;
}

export function IconButton({ icon, label, type = 'button', ...rest }: IconButtonProps) {
  return (
    <button type={type} className="icon-button" aria-label={label} {...rest}>
      <Icon name={icon} size={20} strokeWidth={2.2} />
    </button>
  );
}
