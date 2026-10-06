import { bootstrap } from '@/app/bootstrap';
import type { AppServices } from '@/app/bootstrap';
import type { SyncServer } from '@/domains/sync';
import { HttpSyncServer } from '@/domains/sync/infrastructure';
import { createSyncHandler, memoryVaultStore } from '../../api/sync';
import type { VaultStore } from '../../api/sync';

/** Le 20 septembre 2026 : le jour des maquettes (jour 20 sur 30, 970 € dépensés). */
export const TEST_NOW = new Date('2026-09-20T12:00:00Z');

/** Services réels branchés sur une base IndexedDB en mémoire, propre à chaque appel. */
export function createTestServices(
  options: { search?: string; now?: Date; syncServer?: SyncServer } = {},
): Promise<AppServices> {
  return bootstrap({
    search: options.search ?? '',
    storage: null,
    databaseName: `test-${crypto.randomUUID()}`,
    now: options.now ?? TEST_NOW,
    syncServer: options.syncServer,
  });
}

/**
 * Le vrai serveur de synchronisation (`api/sync.ts`) sur des coffres en mémoire, joint par le vrai
 * client HTTP : seul le réseau est simulé. Deux appareils de test partagent le même `store`.
 */
export function memorySyncServer(store: VaultStore = memoryVaultStore()): HttpSyncServer {
  const handle = createSyncHandler(store);
  return new HttpSyncServer((input, init) =>
    handle(new Request(new URL(input, 'http://test'), init)),
  );
}
