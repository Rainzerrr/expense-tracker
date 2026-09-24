import type { MerchantRule } from './merchantRules';

export interface MerchantRuleRepository {
  /** Règles non supprimées. */
  list(): Promise<MerchantRule[]>;
  /** Crée ou remplace. */
  put(rules: MerchantRule[]): Promise<void>;
}
