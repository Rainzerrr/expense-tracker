import clsx from 'clsx';
import { Link } from 'react-router-dom';
import type { To } from 'react-router-dom';
import { Icon } from '@/shared/ui/atoms/Icon';
import './FocusSwitcher.scss';

export interface FocusSwitcherItem {
  id: string;
  name: string;
  to: To;
  current: boolean;
}

export interface FocusSwitcherProps {
  label: string;
  addLabel: string;
  items: readonly FocusSwitcherItem[];
  addTo: To;
  addState: unknown;
}

/** Passe d'un focus à l'autre, et « + Nouveau » pour en épingler un. */
export function FocusSwitcher({ label, addLabel, items, addTo, addState }: FocusSwitcherProps) {
  return (
    <nav className="focus-switcher" aria-label={label}>
      {items.map((item) => (
        <Link
          key={item.id}
          className={clsx('focus-switcher__chip', item.current && 'focus-switcher__chip--current')}
          to={item.to}
          aria-current={item.current ? 'page' : undefined}
        >
          {item.name}
        </Link>
      ))}
      <Link className="focus-switcher__chip focus-switcher__chip--add" to={addTo} state={addState}>
        <Icon name="plus" size={16} strokeWidth={2.2} />
        {addLabel}
      </Link>
    </nav>
  );
}
