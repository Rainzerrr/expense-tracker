import type { CSSProperties } from 'react';
import './ProgressBar.scss';

export interface ProgressBarProps {
  /** Entre 0 et 1. */
  value: number;
  label: string;
}

export function ProgressBar({ value, label }: ProgressBarProps) {
  const percent = Math.round(Math.min(Math.max(value, 0), 1) * 100);
  return (
    <div
      className="progress-bar"
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
