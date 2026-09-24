import type { Budget } from './budget';

export interface BudgetRepository {
  /** Le budget courant, ou les valeurs par défaut si l'utilisateur ne l'a jamais réglé. */
  get(): Promise<Budget>;
  set(budget: Budget): Promise<void>;
}
