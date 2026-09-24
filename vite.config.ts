import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { defineConfig } from 'vitest/config';

const COLOR = '#f6f5f1';

export default defineConfig({
  plugins: [
    react(),
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
