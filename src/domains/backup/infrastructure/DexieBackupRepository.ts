import type { AppDatabase } from '@/shared/infrastructure/database';
import { EPOCH_INSTANT } from '@/shared/lib/time';
import type { IsoInstant } from '@/shared/lib/time';
import type { BackupData } from '../domain/backupFile';
import type { BackupMetaKey, BackupRepository } from '../domain/BackupRepository';

const BUDGET_ROW_ID = 'current';

/** Le plus ancien des deux, `a` pouvant être absent. En fonction pure pour que TypeScript
 * réduise correctement le type de `a` (une variable réassignée dans une fermeture perd cette narrowing
 * une fois relue en dehors d'elle). */
const earlierOf = (a: IsoInstant | null, b: IsoInstant): IsoInstant =>
  a === null || b < a ? b : a;

export class DexieBackupRepository implements BackupRepository {
  constructor(private readonly db: AppDatabase) {}

  async readAll(): Promise<BackupData> {
    const { db } = this;
    const [expenses, categories, subcategories, tags, focuses, merchantRules, budgetRow] =
      await Promise.all([
        db.expenses.toArray(),
        db.categories.toArray(),
        db.subcategories.toArray(),
        db.tags.toArray(),
        db.focuses.toArray(),
        db.merchantRules.toArray(),
        db.budget.get(BUDGET_ROW_ID),
      ]);
    // null tant que l'utilisateur n'a jamais réglé son budget : on n'exporte pas de valeur inventée.
    const budget = budgetRow
      ? {
          housingCents: budgetRow.housingCents,
          flexCents: budgetRow.flexCents,
          totalCents: budgetRow.totalCents,
          updatedAt: budgetRow.updatedAt,
        }
      : null;
    return { expenses, categories, subcategories, tags, focuses, merchantRules, budget };
  }

  async writeAll(data: BackupData): Promise<void> {
    const { db } = this;
    await db.transaction(
      'rw',
      [
        db.expenses,
        db.categories,
        db.subcategories,
        db.tags,
        db.focuses,
        db.merchantRules,
        db.budget,
      ],
      async () => {
        await db.categories.bulkPut(data.categories);
        await db.subcategories.bulkPut(data.subcategories);
        await db.tags.bulkPut(data.tags);
        await db.focuses.bulkPut(data.focuses);
        await db.merchantRules.bulkPut(data.merchantRules);
        if (data.budget) await db.budget.put({ ...data.budget, id: BUDGET_ROW_ID });
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
    const tables = [
      db.expenses,
      db.categories,
      db.subcategories,
      db.tags,
      db.focuses,
      db.merchantRules,
    ] as const;
    let oldest: IsoInstant | null = null;
    for (const table of tables) {
      await table
        .filter((record) => record.updatedAt > threshold)
        .each((record) => {
          oldest = earlierOf(oldest, record.updatedAt);
        });
    }
    // Le budget est une seule ligne : pas de table à parcourir, juste à comparer.
    const budgetRow = await db.budget.get(BUDGET_ROW_ID);
    if (budgetRow && budgetRow.updatedAt > threshold)
      oldest = earlierOf(oldest, budgetRow.updatedAt);
    return oldest;
  }
}
