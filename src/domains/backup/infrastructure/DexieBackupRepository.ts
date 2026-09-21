import type { AppDatabase } from '@/shared/infrastructure/database';
import { EPOCH_INSTANT } from '@/shared/lib/time';
import type { IsoInstant } from '@/shared/lib/time';
import type { BackupData } from '../domain/backupFile';
import type { BackupMetaKey, BackupRepository } from '../domain/BackupRepository';

export class DexieBackupRepository implements BackupRepository {
  constructor(private readonly db: AppDatabase) {}

  async readAll(): Promise<BackupData> {
    const { db } = this;
    const [expenses, categories, subcategories, tags, focuses] = await Promise.all([
      db.expenses.toArray(),
      db.categories.toArray(),
      db.subcategories.toArray(),
      db.tags.toArray(),
      db.focuses.toArray(),
    ]);
    return { expenses, categories, subcategories, tags, focuses };
  }

  async writeAll(data: BackupData): Promise<void> {
    const { db } = this;
    await db.transaction(
      'rw',
      [db.expenses, db.categories, db.subcategories, db.tags, db.focuses],
      async () => {
        await db.categories.bulkPut(data.categories);
        await db.subcategories.bulkPut(data.subcategories);
        await db.tags.bulkPut(data.tags);
        await db.focuses.bulkPut(data.focuses);
        await db.expenses.bulkPut(data.expenses);
      },
    );
  }

  async getMeta(key: BackupMetaKey): Promise<IsoInstant | null> {
    return ((await this.db.meta.get(key))?.value as IsoInstant | undefined) ?? null;
  }

  async setMeta(key: BackupMetaKey, value: IsoInstant): Promise<void> {
    await this.db.meta.put({ key, value });
  }

  async oldestChangeSince(since: IsoInstant | null): Promise<IsoInstant | null> {
    // Le catalogue par défaut porte la date d'époque : ce n'est pas une modification de l'utilisateur.
    const threshold = since && since > EPOCH_INSTANT ? since : EPOCH_INSTANT;
    const { db } = this;
    const tables = [db.expenses, db.categories, db.subcategories, db.tags, db.focuses] as const;
    let oldest: IsoInstant | null = null;
    for (const table of tables) {
      await table
        .filter((record) => record.updatedAt > threshold)
        .each((record) => {
          if (oldest === null || record.updatedAt < oldest) oldest = record.updatedAt;
        });
    }
    return oldest;
  }
}
