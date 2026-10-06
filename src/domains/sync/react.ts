// Point d'entrée léger, monté dans `RootLayout` : les déclencheurs automatiques. La fusion et Zod
// ne sont chargés qu'à la première synchronisation (import dynamique dans `syncStatus.ts`).
export { useAutoSync } from './application/useAutoSync';
