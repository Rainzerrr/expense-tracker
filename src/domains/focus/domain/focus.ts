import type { Expense } from '@/domains/expenses';
import type { Brand } from '@/shared/lib/brand';
import type { IsoInstant } from '@/shared/lib/time';

export type FocusId = Brand<string, 'FocusId'>;

/** Ce qu'un focus suit : une catégorie entière, une sous-catégorie, ou un tag. */
export type FocusKind = 'category' | 'subcategory' | 'tag';

export interface Focus {
  id: FocusId;
  kind: FocusKind;
  /** Identifiant de la catégorie, de la sous-catégorie ou du tag suivi. */
  targetId: string;
  /** Ordre d'affichage (croissant). */
  position: number;
  /** Sert à la fusion entre appareils. */
  updatedAt: IsoInstant;
  /** Suppression logique : elle voyage d'un appareil à l'autre comme une modification. */
  deletedAt: IsoInstant | null;
}

export type FocusTarget = Pick<Focus, 'kind' | 'targetId'>;

export const sameTarget = (a: FocusTarget, b: FocusTarget) =>
  a.kind === b.kind && a.targetId === b.targetId;

/** Une dépense entre-t-elle dans ce focus ? */
export function focusMatches(
  target: FocusTarget,
  expense: Pick<Expense, 'categoryId' | 'subcategoryId' | 'tagIds'>,
): boolean {
  switch (target.kind) {
    case 'category':
      return expense.categoryId === target.targetId;
    case 'subcategory':
      return expense.subcategoryId === target.targetId;
    case 'tag':
      return expense.tagIds.some((id) => id === target.targetId);
  }
}
