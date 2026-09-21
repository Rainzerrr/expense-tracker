import clsx from 'clsx';
import './StatTile.scss';

export interface StatTileProps {
  label: string;
  value: string;
  hint?: string;
  tone?: 'neutral' | 'accent' | 'success' | 'dark';
  className?: string;
}

export function StatTile({ label, value, hint, tone = 'neutral', className }: StatTileProps) {
  return (
    <div className={clsx('stat-tile', `stat-tile--tone-${tone}`, className)}>
      <p className="stat-tile__label">{label}</p>
      <p className="stat-tile__value">{value}</p>
      {hint && <p className="stat-tile__hint">{hint}</p>}
    </div>
  );
}
