import { Link } from 'react-router-dom';
import type { To } from 'react-router-dom';
import './NoticeBanner.scss';

interface NoticeBannerBaseProps {
  message: string;
  actionLabel: string;
}

export type NoticeBannerProps = NoticeBannerBaseProps &
  // Lien classique (rechargement) : par exemple pour quitter le mode démo.
  (
    | { href: string; to?: never }
    // Navigation dans l'application.
    | { to: To; href?: never }
  );

/** Bandeau d'information avec une action : mode démo, rappel de sauvegarde. */
export function NoticeBanner({ message, actionLabel, href, to }: NoticeBannerProps) {
  return (
    <div className="notice-banner">
      <p className="notice-banner__message">{message}</p>
      {to !== undefined ? (
        <Link className="notice-banner__action" to={to}>
          {actionLabel}
        </Link>
      ) : (
        <a className="notice-banner__action" href={href}>
          {actionLabel}
        </a>
      )}
    </div>
  );
}
