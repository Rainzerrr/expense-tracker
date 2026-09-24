import { useTranslation } from 'react-i18next';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { NoticeBanner } from '@/shared/ui/molecules/NoticeBanner';

/**
 * Prévient quand une nouvelle version est prête et laisse l'utilisateur choisir le moment de recharger
 * (jamais de rechargement surprise pendant une saisie). Sans service worker (développement), rien ne s'affiche.
 */
export function UpdatePrompt() {
  const { t } = useTranslation();
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  if (!needRefresh) return null;
  return (
    <NoticeBanner
      message={t('update.message')}
      actionLabel={t('update.action')}
      onAction={() => void updateServiceWorker(true)}
    />
  );
}
