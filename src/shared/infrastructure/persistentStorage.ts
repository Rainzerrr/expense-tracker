/**
 * Stockage « persistant » : le navigateur s'engage à ne pas effacer les données de l'application
 * quand il manque de place. Sur iPhone, c'est surtout l'installation sur l'écran d'accueil qui
 * protège les données ; cette demande est un complément, accordée ou non selon le navigateur.
 */
export type StorageProtection = 'protected' | 'unprotected' | 'unknown';

export async function getStorageProtection(): Promise<StorageProtection> {
  try {
    if (typeof navigator === 'undefined' || !navigator.storage?.persisted) return 'unknown';
    return (await navigator.storage.persisted()) ? 'protected' : 'unprotected';
  } catch {
    return 'unknown';
  }
}

/** Demande la protection au démarrage (sans effet si elle est déjà accordée). Ne lève jamais d'erreur. */
export async function requestPersistentStorage(): Promise<StorageProtection> {
  try {
    if (typeof navigator === 'undefined' || !navigator.storage?.persist) return 'unknown';
    if (await navigator.storage.persisted()) return 'protected';
    return (await navigator.storage.persist()) ? 'protected' : 'unprotected';
  } catch {
    return 'unknown';
  }
}
