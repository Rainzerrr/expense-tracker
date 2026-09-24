import { useState } from 'react';

/** Remplace `virtual:pwa-register/react` en test : aucun service worker, une mise à jour simulable. */
export const pwaStub = { needRefresh: false, updateServiceWorker: async () => {} };

export function useRegisterSW() {
  const needRefresh = useState(pwaStub.needRefresh);
  const offlineReady = useState(false);
  return { needRefresh, offlineReady, updateServiceWorker: pwaStub.updateServiceWorker };
}
