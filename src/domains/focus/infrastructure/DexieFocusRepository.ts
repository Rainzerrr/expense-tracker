import type { AppDatabase } from '@/shared/infrastructure/database';
import type { Focus } from '../domain/focus';
import type { FocusRepository } from '../domain/FocusRepository';

export class DexieFocusRepository implements FocusRepository {
  constructor(private readonly db: AppDatabase) {}

  async list(): Promise<Focus[]> {
    const all = await this.db.focuses.orderBy('position').toArray();
    return all.filter((focus) => focus.deletedAt === null);
  }

  async put(focuses: Focus[]): Promise<void> {
    await this.db.focuses.bulkPut(focuses);
  }

  async isEmpty(): Promise<boolean> {
    return (await this.db.focuses.count()) === 0;
  }
}
