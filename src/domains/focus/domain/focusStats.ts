import type { CategoryId, SubcategoryId } from '@/domains/categorization';
import { sumCents, toCents } from '@/domains/expenses';
import type { Cents, Expense } from '@/domains/expenses';
import { daysBetween, daysInMonth, monthEnd, monthStart } from '@/shared/lib/time';
import type { LocalDate, YearMonth } from '@/shared/lib/time';
import { focusMatches } from './focus';
import type { FocusTarget } from './focus';

const WEEK_LENGTH = 7;
const COMPOSITION_PARTS = 4;

export interface WeekBar {
  /** Jours du mois : 1–7, 8–14, 15–21, 22–28, 29–fin. */
  startDay: number;
  endDay: number;
  amount: Cents;
  /** La semaine qui contient aujourd'hui : pas encore terminée. */
  isCurrent: boolean;
}

export interface FocusStats {
  total: Cents;
  /** Nombre de dépenses (« achats »). */
  count: number;
  /** Total ÷ nombre d'achats, arrondi au centime. Null sans achat. */
  averageBasket: Cents | null;
  /** Part de toutes les dépenses du mois, entre 0 et 1. */
  shareOfMonth: number;
  /** Rythme observé ramené à 7 jours, arrondi au centime. */
  weeklyRate: Cents;
  weeks: WeekBar[];
  /** Les dépenses du focus, de la plus récente à la plus ancienne. */
  entries: Expense[];
}

export interface FocusStatsInput {
  target: FocusTarget;
  /** Toutes les dépenses non supprimées du mois. */
  expenses: readonly Expense[];
  month: YearMonth;
  today: LocalDate;
}

/** Ce que le focus a coûté ce mois-ci, et à quel rythme. */
export function focusStats({ target, expenses, month, today }: FocusStatsInput): FocusStats {
  const start = monthStart(month);
  const end = monthEnd(month);
  const totalDays = daysInMonth(month);

  const matching = expenses
    .filter((expense) => focusMatches(target, expense))
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
  const total = sumCents(matching.map((e) => e.amount));
  const monthTotal = sumCents(expenses.map((e) => e.amount));

  // Dernier jour écoulé du mois (0 : le mois n'a pas commencé), comme pour la projection du dashboard.
  const lastDay = today < start ? 0 : today > end ? totalDays : daysBetween(start, today) + 1;

  const weeks: WeekBar[] = [];
  for (let startDay = 1; startDay <= Math.min(lastDay, totalDays); startDay += WEEK_LENGTH) {
    const endDay = Math.min(startDay + WEEK_LENGTH - 1, totalDays);
    const amount = sumCents(
      matching
        .filter((e) => {
          const day = daysBetween(start, e.date) + 1;
          return day >= startDay && day <= endDay;
        })
        .map((e) => e.amount),
    );
    weeks.push({
      startDay,
      endDay,
      amount,
      isCurrent: lastDay < totalDays && lastDay >= startDay && lastDay <= endDay,
    });
  }

  return {
    total,
    count: matching.length,
    averageBasket: matching.length > 0 ? toCents(Math.round(total / matching.length)) : null,
    shareOfMonth: monthTotal > 0 ? total / monthTotal : 0,
    weeklyRate: lastDay > 0 ? toCents(Math.round((total / lastDay) * WEEK_LENGTH)) : toCents(0),
    weeks,
    entries: matching,
  };
}

export interface CompositionPart<Id> {
  /** null : les dépenses sans sous-catégorie. */
  id: Id | null;
  amount: Cents;
}

/**
 * « Dans tes courses » : une sous-catégorie face au reste de sa catégorie.
 * « Répartition » d'une catégorie (par sous-catégorie) ou d'un tag (par catégorie) : les plus gros postes.
 */
export type FocusComposition =
  | { kind: 'share-of-parent'; parentCategoryId: CategoryId; focusAmount: Cents; restAmount: Cents }
  | { kind: 'by-subcategory'; parts: CompositionPart<SubcategoryId>[]; others: Cents }
  | { kind: 'by-category'; parts: CompositionPart<CategoryId>[]; others: Cents };

function topParts<Id extends string>(amounts: Map<Id | null, number>) {
  const sorted = [...amounts]
    .filter(([, amount]) => amount > 0)
    .sort(([, a], [, b]) => b - a)
    .map(([id, amount]): CompositionPart<Id> => ({ id, amount: toCents(amount) }));
  return {
    parts: sorted.slice(0, COMPOSITION_PARTS),
    others: sumCents(sorted.slice(COMPOSITION_PARTS).map((part) => part.amount)),
  };
}

export interface FocusCompositionInput {
  target: FocusTarget;
  expenses: readonly Expense[];
  /** Catégorie d'une sous-catégorie (pour comparer une sous-catégorie à sa catégorie). */
  parentCategoryOf: (subcategoryId: SubcategoryId) => CategoryId | undefined;
}

export function focusComposition({
  target,
  expenses,
  parentCategoryOf,
}: FocusCompositionInput): FocusComposition | null {
  const matching = expenses.filter((expense) => focusMatches(target, expense));

  if (target.kind === 'subcategory') {
    const parentCategoryId = parentCategoryOf(target.targetId as SubcategoryId);
    if (!parentCategoryId) return null;
    const parentTotal = sumCents(
      expenses.filter((e) => e.categoryId === parentCategoryId).map((e) => e.amount),
    );
    const focusAmount = sumCents(matching.map((e) => e.amount));
    return {
      kind: 'share-of-parent',
      parentCategoryId,
      focusAmount,
      restAmount: toCents(Math.max(parentTotal - focusAmount, 0)),
    };
  }

  if (target.kind === 'category') {
    const amounts = new Map<SubcategoryId | null, number>();
    for (const e of matching)
      amounts.set(e.subcategoryId, (amounts.get(e.subcategoryId) ?? 0) + e.amount);
    return { kind: 'by-subcategory', ...topParts(amounts) };
  }

  const amounts = new Map<CategoryId | null, number>();
  for (const e of matching) amounts.set(e.categoryId, (amounts.get(e.categoryId) ?? 0) + e.amount);
  return { kind: 'by-category', ...topParts(amounts) };
}
