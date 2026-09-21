import type { IsoInstant, LocalDate, YearMonth } from '@/shared/lib/time';
import type { Expense, ExpenseId } from './expense';

/** Port : le domaine décrit ce dont il a besoin, l'infrastructure (Dexie) l'implémente. */
export interface ExpenseRepository {
  add(expense: Expense): Promise<void>;
  addMany(expenses: Expense[]): Promise<void>;
  update(expense: Expense): Promise<void>;
  softDelete(id: ExpenseId, at: IsoInstant): Promise<void>;
  /** Annule une suppression logique (bouton « Annuler »). */
  restore(id: ExpenseId, at: IsoInstant): Promise<void>;
  /** Une dépense supprimée logiquement n'est jamais retournée. */
  findById(id: ExpenseId): Promise<Expense | undefined>;
  /** Dépenses non supprimées du mois, de la plus récente à la plus ancienne. */
  findByMonth(month: YearMonth): Promise<Expense[]>;
  /** Dépenses non supprimées entre deux dates (incluses), de la plus récente à la plus ancienne. */
  findBetween(from: LocalDate, to: LocalDate): Promise<Expense[]>;
  /** Vrai si aucune dépense n'a jamais été enregistrée (supprimées comprises). */
  isEmpty(): Promise<boolean>;
}
