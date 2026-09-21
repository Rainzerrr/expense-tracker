import type { RouteObject } from 'react-router-dom';
import { RootLayout } from './RootLayout';
import { RouteError } from './RouteError';

// Chaque page est chargée à la demande pour garder le JavaScript initial léger.
export const routes: RouteObject[] = [
  {
    path: '/',
    element: <RootLayout />,
    HydrateFallback: () => null,
    children: [
      {
        // Route sans chemin : l'erreur d'une page garde la navigation visible.
        errorElement: <RouteError />,
        children: [
          {
            index: true,
            lazy: async () => ({
              Component: (await import('@/pages/DashboardPage')).DashboardPage,
            }),
          },
          {
            path: 'stats',
            lazy: async () => ({ Component: (await import('@/pages/StatsPage')).StatsPage }),
          },
          {
            path: 'focus',
            lazy: async () => ({ Component: (await import('@/pages/FocusPage')).FocusPage }),
          },
          {
            path: 'focus/:focusId',
            lazy: async () => ({ Component: (await import('@/pages/FocusPage')).FocusPage }),
          },
          {
            path: 'history',
            lazy: async () => ({ Component: (await import('@/pages/HistoryPage')).HistoryPage }),
          },
          {
            path: 'settings',
            lazy: async () => ({
              Component: (await import('@/pages/SettingsPage')).SettingsPage,
            }),
          },
        ],
      },
    ],
  },
];
