import type { CategoryId } from '@/domains/categorization';
import type { Cents } from '@/domains/expenses';
import type { IsoInstant } from '@/shared/lib/time';

/**
 * Objectif mensuel, en trois montants : le logement (fixe), les courses et activités
 * ensemble (souple : on peut puiser dans l'un pour l'autre), et le total du mois (l'objectif
 * qui compte vraiment, toutes catégories confondues).
 */
export interface Budget {
  housingCents: Cents;
  /** Courses + Activités réunies. Le dépasser n'est pas grave en soi. */
  flexCents: Cents;
  /** Toutes les dépenses du mois, loyer compris. C'est l'objectif à ne pas dépasser. */
  totalCents: Cents;
  updatedAt: IsoInstant;
}

/** Les deux catégories « souples » du budget : Courses et Activités. */
export const FLEX_CATEGORY_IDS: readonly CategoryId[] = ['groceries', 'activities'] as CategoryId[];

export const DEFAULT_BUDGET: Omit<Budget, 'updatedAt'> = {
  housingCents: 100000 as Cents,
  flexCents: 40000 as Cents,
  totalCents: 140000 as Cents,
};
