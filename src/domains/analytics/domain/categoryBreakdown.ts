import type { CategoryId } from '@/domains/categorization';
import { sumCents, toCents } from '@/domains/expenses';
import type { Cents } from '@/domains/expenses';

export interface BreakdownSlice {
  /** null : le regroupement « Autres ». */
  categoryId: CategoryId | null;
  amount: Cents;
  /** Part du total, entre 0 et 1. */
  share: number;
}

export interface CategoryBreakdown {
  total: Cents;
  slices: BreakdownSlice[];
}

/**
 * Répartition du mois : les `maxSlices` plus grosses catégories, le reste regroupé dans « Autres »
 * (placé en dernier). Si le regroupement ne concernerait qu'une seule catégorie, on l'affiche telle quelle.
 */
export function categoryBreakdown(
  expenses: readonly { amount: number; categoryId: CategoryId }[],
  maxSlices = 5,
): CategoryBreakdown {
  const totals = new Map<CategoryId, number>();
  for (const { amount, categoryId } of expenses) {
    totals.set(categoryId, (totals.get(categoryId) ?? 0) + amount);
  }

  const total = sumCents(totals.values());
  const sorted = [...totals.entries()]
    .filter(([, amount]) => amount > 0)
    // À montant égal, l'identifiant départage : l'ordre reste stable d'un affichage à l'autre.
    .sort(([idA, a], [idB, b]) => b - a || idA.localeCompare(idB));

  const share = (amount: number) => (total > 0 ? amount / total : 0);
  const asSlice = ([categoryId, amount]: [CategoryId, number]): BreakdownSlice => ({
    categoryId,
    amount: toCents(amount),
    share: share(amount),
  });

  if (sorted.length <= maxSlices + 1) return { total, slices: sorted.map(asSlice) };

  const others = sumCents(sorted.slice(maxSlices).map(([, amount]) => amount));
  return {
    total,
    slices: [
      ...sorted.slice(0, maxSlices).map(asSlice),
      { categoryId: null, amount: others, share: share(others) },
    ],
  };
}
