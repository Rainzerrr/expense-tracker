import type { AppDatabase } from '@/shared/infrastructure/database';
import type { SyncCode } from '../domain/syncCode';
import type { SyncSettingsRepository } from '../domain/SyncSettingsRepository';

const CODE_KEY = 'syncCode';

/** Le code vit dans la table `meta`, qui ne voyage pas dans les fichiers de sauvegarde. */
export class DexieSyncSettingsRepository implements SyncSettingsRepository {
  constructor(private readonly db: AppDatabase) {}

  async getCode(): Promise<SyncCode | null> {
    return ((await this.db.meta.get(CODE_KEY))?.value as SyncCode | undefined) ?? null;
  }

  async setCode(code: SyncCode): Promise<void> {
    await this.db.meta.put({ key: CODE_KEY, value: code });
  }

  async clearCode(): Promise<void> {
    await this.db.meta.delete(CODE_KEY);
  }
}
