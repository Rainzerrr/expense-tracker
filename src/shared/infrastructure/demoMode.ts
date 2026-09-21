export const DEMO_STORAGE_KEY = 'expense-tracker:demo';

export type SessionStorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

/**
 * `?demo=1` active la démo, `?demo=0` la quitte. Le choix est mémorisé pour la session :
 * naviguer vers /history (qui perd le paramètre) puis recharger ne bascule pas
 * silencieusement sur les vraies données. Volontairement pas dans localStorage : la démo
 * ne doit pas rester activée d'une visite à l'autre.
 */
export function resolveDemoMode(search: string, storage: SessionStorageLike | null): boolean {
  const param = new URLSearchParams(search).get('demo');
  try {
    if (param === '1') storage?.setItem(DEMO_STORAGE_KEY, '1');
    else if (param === '0') storage?.removeItem(DEMO_STORAGE_KEY);
    else return storage?.getItem(DEMO_STORAGE_KEY) === '1';
  } catch {
    // Stockage indisponible : seul le paramètre de l'URL courante compte.
  }
  return param === '1';
}
