import { bootstrap } from '@/app/bootstrap';
import type { AppServices } from '@/app/bootstrap';

/** Le 20 septembre 2026 : le jour des maquettes (jour 20 sur 30, 970 € dépensés). */
export const TEST_NOW = new Date('2026-09-20T12:00:00Z');

/** Services réels branchés sur une base IndexedDB en mémoire, propre à chaque appel. */
export function createTestServices(
  options: { search?: string; now?: Date } = {},
): Promise<AppServices> {
  return bootstrap({
    search: options.search ?? '',
    storage: null,
    databaseName: `test-${crypto.randomUUID()}`,
    now: options.now ?? TEST_NOW,
  });
}
