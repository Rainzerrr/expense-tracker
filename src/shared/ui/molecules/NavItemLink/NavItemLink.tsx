import clsx from 'clsx';
import { NavLink } from 'react-router-dom';
import { Icon } from '@/shared/ui/atoms/Icon';
import type { IconName } from '@/shared/ui/atoms/Icon';
import './NavItemLink.scss';

export interface NavItem {
  to: string;
  label: string;
  icon: IconName;
}

export interface NavItemLinkProps {
  item: NavItem;
  /** stacked : icône au-dessus du libellé (barre du bas). inline : icône à gauche (barre latérale). */
  layout: 'stacked' | 'inline';
}

export function NavItemLink({ item, layout }: NavItemLinkProps) {
  return (
    <NavLink
      to={item.to}
      end={item.to === '/'}
      className={clsx('nav-item-link', `nav-item-link--layout-${layout}`)}
    >
      <Icon name={item.icon} size={layout === 'stacked' ? 24 : 20} />
      <span>{item.label}</span>
    </NavLink>
  );
}
