import { Link } from 'react-router-dom';
import type { To } from 'react-router-dom';
import { Icon } from '@/shared/ui/atoms/Icon';
import { NavItemLink } from '@/shared/ui/molecules/NavItemLink';
import type { NavItem } from '@/shared/ui/molecules/NavItemLink';
import './BottomNav.scss';

export interface BottomNavProps {
  label: string;
  leadingItems: NavItem[];
  trailingItems: NavItem[];
  /** Action principale, au centre : à portée du pouce. */
  action: { to: To; label: string; state?: unknown };
}

export function BottomNav({ label, leadingItems, trailingItems, action }: BottomNavProps) {
  return (
    <nav className="bottom-nav" aria-label={label}>
      {leadingItems.map((item) => (
        <NavItemLink key={item.to} item={item} layout="stacked" />
      ))}
      <Link
        to={action.to}
        state={action.state}
        className="bottom-nav__action"
        aria-label={action.label}
      >
        <Icon name="plus" size={28} strokeWidth={2.2} />
      </Link>
      {trailingItems.map((item) => (
        <NavItemLink key={item.to} item={item} layout="stacked" />
      ))}
    </nav>
  );
}
