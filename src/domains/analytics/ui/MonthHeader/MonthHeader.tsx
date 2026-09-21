import type { ReactNode } from 'react';
import { Heading } from '@/shared/ui/atoms/Heading';
import { IconButton } from '@/shared/ui/atoms/IconButton';
import './MonthHeader.scss';

export interface MonthHeaderProps {
  /** Petite ligne au-dessus du titre (mobile) : « Lisbonne · Jour 20 sur 153 ». */
  eyebrow: string;
  /** « Septembre 2026 » : le titre de la page. */
  title: string;
  previousLabel: string;
  nextLabel: string;
  /** Absent : le bouton est désactivé (début du séjour, ou mois en cours). */
  onPrevious?: () => void;
  onNext?: () => void;
  /** Action principale à droite sur grand écran (« Nouvelle dépense »). */
  action?: ReactNode;
}

export function MonthHeader({
  eyebrow,
  title,
  previousLabel,
  nextLabel,
  onPrevious,
  onNext,
  action,
}: MonthHeaderProps) {
  return (
    <header className="month-header">
      <div className="month-header__titles">
        <p className="month-header__eyebrow">{eyebrow}</p>
        <div className="month-header__row">
          <Heading level={1}>{title}</Heading>
          <div className="month-header__nav">
            <IconButton
              icon="chevronLeft"
              label={previousLabel}
              disabled={!onPrevious}
              onClick={onPrevious}
            />
            <IconButton icon="chevronRight" label={nextLabel} disabled={!onNext} onClick={onNext} />
          </div>
        </div>
      </div>
      {action && <div className="month-header__action">{action}</div>}
    </header>
  );
}
