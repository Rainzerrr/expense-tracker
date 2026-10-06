import { useTranslation } from 'react-i18next';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { NoticeBanner } from '@/shared/ui/molecules/NoticeBanner';

/**
 * Le navigateur ne cherche une nouvelle version qu'au vrai démarrage. Sur iPhone, une app installée
 * rouverte depuis l'arrière-plan ne redémarre pas : sans ceci, la mise à jour n'était jamais proposée.
 */
function checkForUpdatesOnResume(_url: string, registration: ServiceWorkerRegistration | undefined) {
  if (!registration) return;
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void registration.update().catch(() => {});
  });
}

/**
 * Prévient quand une nouvelle version est prête et laisse l'utilisateur choisir le moment de recharger
 * (jamais de rechargement surprise pendant une saisie). Sans service worker (développement), rien ne s'affiche.
 */
export function UpdatePrompt() {
  const { t } = useTranslation();
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({ onRegisteredSW: checkForUpdatesOnResume });

  if (!needRefresh) return null;
  return (
    <NoticeBanner
      message={t('update.message')}
      actionLabel={t('update.action')}
      onAction={() => void updateServiceWorker(true)}
    />
  );
}
