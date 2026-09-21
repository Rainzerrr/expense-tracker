import { ProgressBar } from '@/shared/ui/atoms/ProgressBar';
import './StayProgress.scss';

export interface StayProgressProps {
  title: string;
  dayLabel: string;
  rangeLabel: string;
  /** Entre 0 et 1. */
  progress: number;
}

export function StayProgress({ title, dayLabel, rangeLabel, progress }: StayProgressProps) {
  return (
    <div className="stay-progress">
      <p className="stay-progress__row">
        <span className="stay-progress__title">{title}</span>
        <span className="stay-progress__day">{dayLabel}</span>
      </p>
      <ProgressBar value={progress} label={title} />
      <p className="stay-progress__range">{rangeLabel}</p>
    </div>
  );
}
