import { DEFAULT_BUDGET } from '../domain/budget';
import type { Budget } from '../domain/budget';
import type { AppDatabase } from '@/shared/infrastructure/database';
import { EPOCH_INSTANT } from '@/shared/lib/time';
import type { BudgetRepository } from '../domain/BudgetRepository';

const ROW_ID = 'current';

export class DexieBudgetRepository implements BudgetRepository {
  constructor(private readonly db: AppDatabase) {}

  async get(): Promise<Budget> {
    const row = await this.db.budget.get(ROW_ID);
    return row ?? { ...DEFAULT_BUDGET, updatedAt: EPOCH_INSTANT };
  }

  async set(budget: Budget): Promise<void> {
    await this.db.budget.put({ ...budget, id: ROW_ID });
  }
}
