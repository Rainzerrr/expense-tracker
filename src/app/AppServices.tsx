import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import type { AppServices } from './bootstrap';

const AppServicesContext = createContext<AppServices | null>(null);

export function AppServicesProvider({
  value,
  children,
}: {
  value: AppServices;
  children: ReactNode;
}) {
  return <AppServicesContext.Provider value={value}>{children}</AppServicesContext.Provider>;
}

export function useAppServices(): AppServices {
  const services = useContext(AppServicesContext);
  if (!services) throw new Error('useAppServices doit être utilisé dans un AppServicesProvider');
  return services;
}
