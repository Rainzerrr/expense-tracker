import '@fontsource-variable/bricolage-grotesque';
import '@fontsource-variable/dm-sans';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from '@/app/App';
import { AppServicesProvider } from '@/app/AppServices';
import { bootstrap } from '@/app/bootstrap';
import { StorageError } from '@/app/StorageError';
import '@/shared/i18n';
import { requestPersistentStorage } from '@/shared/infrastructure/persistentStorage';
import '@/shared/styles/main.scss';

const container = document.getElementById('root');
if (!container) throw new Error('Élément #root introuvable');
const root = createRoot(container);

// sessionStorage peut lever une exception (navigation privée, stockage bloqué).
function safeSessionStorage() {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

bootstrap({ search: window.location.search, storage: safeSessionStorage() })
  .then((services) => {
    // Demande au navigateur de ne pas effacer les données quand il manque de place (sans effet s'il refuse).
    void requestPersistentStorage();
    root.render(
      <StrictMode>
        <AppServicesProvider value={services}>
          <App />
        </AppServicesProvider>
      </StrictMode>,
    );
  })
  .catch((error: unknown) => {
    console.error(error);
    root.render(<StorageError />);
  });
