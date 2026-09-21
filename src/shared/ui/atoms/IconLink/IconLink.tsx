import { Link } from 'react-router-dom';
import type { LinkProps } from 'react-router-dom';
import { Icon } from '@/shared/ui/atoms/Icon';
import type { IconName } from '@/shared/ui/atoms/Icon';
import '../IconButton/IconButton.scss';

export interface IconLinkProps extends Omit<LinkProps, 'children' | 'aria-label'> {
  icon: IconName;
  /** Obligatoire : un lien sans texte visible a besoin d'un nom. */
  label: string;
}

/** Comme `IconButton`, mais c'est une navigation : un `<a>`. */
export function IconLink({ icon, label, ...rest }: IconLinkProps) {
  return (
    <Link className="icon-button" aria-label={label} {...rest}>
      <Icon name={icon} size={20} strokeWidth={2.2} />
    </Link>
  );
}
