import clsx from 'clsx';
import type { CSSProperties } from 'react';
import './ProgressBar.scss';

export interface ProgressBarProps {
  /** Entre 0 et 1 ; peut dépasser 1 (le remplissage reste à 100 %, la couleur change de ton). */
  value: number;
  label: string;
  /** `warning` : dépassement sans gravité. `danger` : dépassement de l'objectif qui compte. */
  tone?: 'accent' | 'warning' | 'danger';
}

export function ProgressBar({ value, label, tone = 'accent' }: ProgressBarProps) {
  const percent = Math.round(Math.min(Math.max(value, 0), 1) * 100);
  return (
    <div
      className={clsx('progress-bar', `progress-bar--tone-${tone}`)}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      style={{ '--progress': `${percent}%` } as CSSProperties}
    >
      <div className="progress-bar__fill" />
    </div>
  );
}
