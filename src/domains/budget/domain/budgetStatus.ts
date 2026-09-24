import type { CategoryId } from '@/domains/categorization';
import { sumCents, toCents } from '@/domains/expenses';
import type { Cents } from '@/domains/expenses';
import { FLEX_CATEGORY_IDS } from './budget';
import type { Budget } from './budget';

export interface BudgetLineStatus {
  spent: Cents;
  target: Cents;
  /** Peut être négatif : le montant dépassé. */
  remaining: Cents;
  /** Peut dépasser 1 (au-delà de l'objectif). */
  percent: number;
  isOver: boolean;
}

export interface BudgetStatus {
  housing: BudgetLineStatus;
  /** Courses + Activités : dépasser n'est pas grave, seulement indicatif. */
  flex: BudgetLineStatus;
  /** Toutes catégories confondues : le vrai objectif du mois. */
  total: BudgetLineStatus;
}

function line(spent: number, target: Cents): BudgetLineStatus {
  return {
    spent: toCents(spent),
    target,
    remaining: toCents(target - spent),
    percent: target > 0 ? spent / target : 0,
    isOver: spent > target,
  };
}

export interface BudgetStatusInput {
  /** Dépenses non supprimées du mois. */
  expenses: readonly { amount: number; categoryId: CategoryId }[];
  fixedCategoryIds: readonly CategoryId[];
  budget: Budget;
}

/** Où on en est par rapport à l'objectif du mois : logement, courses + activités, total. */
export function computeBudgetStatus({
  expenses,
  fixedCategoryIds,
  budget,
}: BudgetStatusInput): BudgetStatus {
  const housingSpent = sumCents(
    expenses.filter((e) => fixedCategoryIds.includes(e.categoryId)).map((e) => e.amount),
  );
  const flexSpent = sumCents(
    expenses.filter((e) => FLEX_CATEGORY_IDS.includes(e.categoryId)).map((e) => e.amount),
  );
  const totalSpent = sumCents(expenses.map((e) => e.amount));

  return {
    housing: line(housingSpent, budget.housingCents),
    flex: line(flexSpent, budget.flexCents),
    total: line(totalSpent, budget.totalCents),
  };
}
