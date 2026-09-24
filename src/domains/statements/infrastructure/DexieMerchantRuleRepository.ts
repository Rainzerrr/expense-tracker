import type { AppDatabase } from '@/shared/infrastructure/database';
import type { MerchantRule } from '../domain/merchantRules';
import type { MerchantRuleRepository } from '../domain/MerchantRuleRepository';

export class DexieMerchantRuleRepository implements MerchantRuleRepository {
  constructor(private readonly db: AppDatabase) {}

  async list(): Promise<MerchantRule[]> {
    return (await this.db.merchantRules.toArray()).filter((rule) => rule.deletedAt === null);
  }

  async put(rules: MerchantRule[]): Promise<void> {
    if (rules.length > 0) await this.db.merchantRules.bulkPut(rules);
  }
}
