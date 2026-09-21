import type { ReactNode } from 'react';
import { Icon } from '@/shared/ui/atoms/Icon';
import { NavItemLink } from '@/shared/ui/molecules/NavItemLink';
import type { NavItem } from '@/shared/ui/molecules/NavItemLink';
import './Sidebar.scss';

export interface SidebarProps {
  title: string;
  subtitle: string;
  navLabel: string;
  items: NavItem[];
  /** Bloc en bas de la barre (progression du séjour). */
  footer?: ReactNode;
}

export function Sidebar({ title, subtitle, navLabel, items, footer }: SidebarProps) {
  return (
    <div className="sidebar">
      <div className="sidebar__brand">
        <span className="sidebar__logo">
          <Icon name="stats" size={22} strokeWidth={2} />
        </span>
        <div>
          <p className="sidebar__title">{title}</p>
          <p className="sidebar__subtitle">{subtitle}</p>
        </div>
      </div>
      <nav aria-label={navLabel}>
        <ul className="sidebar__list">
          {items.map((item) => (
            <li key={item.to}>
              <NavItemLink item={item} layout="inline" />
            </li>
          ))}
        </ul>
      </nav>
      {footer && <div className="sidebar__footer">{footer}</div>}
    </div>
  );
}
