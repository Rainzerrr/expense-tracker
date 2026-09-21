import clsx from 'clsx';
import { useId } from 'react';
import type { ReactNode } from 'react';
import './CardSection.scss';

export interface CardSectionProps {
  title: string;
  subtitle?: string;
  /** Lien ou bouton à droite du titre (« Historique »). */
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}

export function CardSection({ title, subtitle, action, className, children }: CardSectionProps) {
  const titleId = useId();
  return (
    <section className={clsx('card-section', className)} aria-labelledby={titleId}>
      <header className="card-section__header">
        <div>
          <h2 id={titleId} className="card-section__title">
            {title}
          </h2>
          {subtitle && <p className="card-section__subtitle">{subtitle}</p>}
        </div>
        {action && <div className="card-section__action">{action}</div>}
      </header>
      {children}
    </section>
  );
}
