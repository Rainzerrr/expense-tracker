import type { ReactNode } from 'react';
import './AppShell.scss';

export interface AppShellProps {
  sidebar: ReactNode;
  bottomNav: ReactNode;
  children: ReactNode;
}

/** Mise en page : barre du bas sur mobile, barre latérale à partir de 1024 px. */
export function AppShell({ sidebar, bottomNav, children }: AppShellProps) {
  return (
    <div className="app-shell">
      <aside className="app-shell__sidebar">{sidebar}</aside>
      <main className="app-shell__main">{children}</main>
      <div className="app-shell__bottom-nav">{bottomNav}</div>
    </div>
  );
}
