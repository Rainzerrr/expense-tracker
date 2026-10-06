import type { IncomingMessage, ServerResponse } from 'node:http';
import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import type { Plugin } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { defineConfig } from 'vitest/config';
import { createSyncHandler, memoryVaultStore } from './api/sync.ts';

const COLOR = '#f6f5f1';

/**
 * `/api/sync` en local (`npm run dev`, `dev:lan`, `vite preview`) : la même fonction que sur
 * Vercel, avec des coffres en mémoire (perdus à l'arrêt du serveur).
 */
function devSyncApi(): Plugin {
  const handle = createSyncHandler(memoryVaultStore());
  const middleware = async (req: IncomingMessage, res: ServerResponse) => {
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(chunk as Buffer);
    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      if (typeof value === 'string') headers.set(key, value);
    }
    const response = await handle(
      new Request(`http://localhost${req.url ?? '/'}`, {
        method: req.method,
        headers,
        body: req.method === 'GET' || req.method === 'HEAD' ? undefined : Buffer.concat(chunks),
      }),
    );
    res.statusCode = response.status;
    response.headers.forEach((value, key) => res.setHeader(key, value));
    res.end(Buffer.from(await response.arrayBuffer()));
  };
  return {
    name: 'dev-sync-api',
    configureServer: (server) => void server.middlewares.use('/api/sync', middleware),
    configurePreviewServer: (server) => void server.middlewares.use('/api/sync', middleware),
  };
}

export default defineConfig({
  plugins: [
    react(),
    devSyncApi(),
    VitePWA({
      // « prompt » : quand une nouvelle version est prête, l'utilisateur choisit le moment de recharger
      // (jamais de rechargement surprise pendant une saisie).
      registerType: 'prompt',
      // L'enregistrement est fait par le hook `useRegisterSW` (voir UpdatePrompt), pas par un script injecté.
      injectRegister: false,
      includeAssets: ['favicon.ico', 'apple-touch-icon-180x180.png', 'logo.svg'],
      manifest: {
        name: 'Lisboa : dépenses Erasmus',
        short_name: 'Lisboa',
        description: 'Suivi des dépenses de mon Erasmus à Lisbonne, sur mon appareil, sans compte.',
        lang: 'fr',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        theme_color: COLOR,
        background_color: COLOR,
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
        // Android / bureau : appui long sur l'icône. iOS ignore les raccourcis.
        shortcuts: [
          {
            name: 'Nouvelle dépense',
            url: '/?new=1',
            icons: [{ src: 'pwa-192x192.png', sizes: '192x192' }],
          },
        ],
      },
      workbox: {
        // Tout ce qui est nécessaire pour démarrer sans réseau, polices auto-hébergées comprises.
        globPatterns: ['**/*.{js,css,html,woff2,png,svg,ico}'],
        // Le vietnamien n'est jamais utilisé : inutile de le télécharger à l'installation.
        globIgnores: ['**/*-vietnamese-*.woff2'],
        // Toute navigation hors ligne (/history, /focus/…, ?demo=1) retombe sur l'application.
        navigateFallback: '/index.html',
        // L'API de synchronisation n'est jamais servie par le cache ni remplacée par l'application.
        navigateFallbackDenylist: [/^\/api\//],
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      // Module virtuel fourni par le plugin PWA au build : en test, un remplaçant contrôlable.
      ...(process.env.VITEST
        ? {
            'virtual:pwa-register/react': fileURLToPath(
              new URL('./src/test/pwaRegisterStub.ts', import.meta.url),
            ),
          }
        : {}),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
});
