import { lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { Outlet } from 'react-router-dom';
import { NoticeBanner } from '@/shared/ui/molecules/NoticeBanner';
import type { NavItem } from '@/shared/ui/molecules/NavItemLink';
import { BottomNav } from '@/shared/ui/organisms/BottomNav';
import { Sidebar } from '@/shared/ui/organisms/Sidebar';
import { AppShell } from '@/shared/ui/templates/AppShell';
import { useAppServices } from './AppServices';
import { UpdatePrompt } from './UpdatePrompt';
import { useEditExpensePanel, useFocusManagerPanel, useNewExpensePanel } from './panels';
import { useUndoToast } from './undoToast';
import { StayProgressSummary } from './StayProgressSummary';

const DEMO_EXIT_HREF = '/?demo=0';

// Le panneau (formulaire, Zod, Radix) n'est chargé qu'à la première ouverture.
const ExpenseCreatePage = lazy(() =>
  import('@/pages/ExpenseCreatePage').then((module) => ({ default: module.ExpenseCreatePage })),
);
// Le toast (Radix) n'est téléchargé qu'à la première suppression.
const UndoToast = lazy(() =>
  import('@/shared/ui/organisms/UndoToast').then((module) => ({ default: module.UndoToast })),
);
const FocusManagerPage = lazy(() =>
  import('@/pages/FocusManagerPage').then((module) => ({ default: module.FocusManagerPage })),
);
const ExpenseEditPage = lazy(() =>
  import('@/pages/ExpenseEditPage').then((module) => ({ default: module.ExpenseEditPage })),
);

export function RootLayout() {
  const { t } = useTranslation();
  const { isDemo } = useAppServices();
  const { t: tExpenses } = useTranslation('expenses');
  const panel = useNewExpensePanel();
  const edit = useEditExpensePanel();
  const focusPanel = useFocusManagerPanel();
  const toast = useUndoToast((state) => state.toast);
  const dismissToast = useUndoToast((state) => state.dismiss);

  const home: NavItem = { to: '/', label: t('nav.home'), icon: 'home' };
  const history: NavItem = { to: '/history', label: t('nav.history'), icon: 'list' };
  const settings: NavItem = { to: '/settings', label: t('nav.settings'), icon: 'settings' };

  return (
    <AppShell
      sidebar={
        <Sidebar
          title={t('app.name')}
          subtitle={t('app.tagline')}
          navLabel={t('nav.label')}
          items={[home, history, settings]}
          footer={<StayProgressSummary />}
        />
      }
      bottomNav={
        <BottomNav
          label={t('nav.label')}
          leadingItems={[home]}
          trailingItems={[history, settings]}
          action={{ to: panel.openTo, state: panel.openState, label: t('nav.addExpense') }}
        />
      }
    >
      <UpdatePrompt />
      {isDemo && (
        <NoticeBanner
          message={t('demo.banner')}
          actionLabel={t('demo.exit')}
          href={DEMO_EXIT_HREF}
        />
      )}
      <Outlet />
      {panel.isOpen && (
        <Suspense fallback={null}>
          <ExpenseCreatePage onClose={panel.close} />
        </Suspense>
      )}
      {edit.expenseId && (
        <Suspense fallback={null}>
          <ExpenseEditPage id={edit.expenseId} onClose={edit.close} />
        </Suspense>
      )}
      {focusPanel.isOpen && (
        <Suspense fallback={null}>
          <FocusManagerPage onClose={focusPanel.close} />
        </Suspense>
      )}
      {toast && (
        <Suspense fallback={null}>
          <UndoToast
            toast={toast}
            dismissLabel={tExpenses('toast.dismiss')}
            regionLabel={tExpenses('toast.region')}
            onDismiss={dismissToast}
          />
        </Suspense>
      )}
    </AppShell>
  );
}
