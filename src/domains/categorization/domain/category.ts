import type { Brand } from '@/shared/lib/brand';
import type { IsoInstant } from '@/shared/lib/time';

export type CategoryId = Brand<string, 'CategoryId'>;
export type SubcategoryId = Brand<string, 'SubcategoryId'>;
export type TagId = Brand<string, 'TagId'>;

/** Une couleur de la palette du projet (variable CSS `--category-<couleur>`). */
export const CATEGORY_COLORS = [
  'housing',
  'groceries',
  'activities',
  'transport',
  'travel',
  'subscriptions',
  'health',
  'shopping',
  'misc',
] as const;
export type CategoryColor = (typeof CATEGORY_COLORS)[number];

/**
 * `systemKey` : clé d'une catégorie fournie par défaut, dont le libellé vient des traductions.
 * `name` : libellé choisi par l'utilisateur (catégorie créée ou renommée), affiché tel quel.
 */
export interface Category {
  id: CategoryId;
  systemKey: string | null;
  name: string | null;
  color: CategoryColor;
  position: number;
  /** Sert à la fusion entre appareils : la version la plus récente l'emporte. */
  updatedAt: IsoInstant;
  /** Suppression logique : elle voyage d'un appareil à l'autre comme une modification. */
  deletedAt: IsoInstant | null;
}

export interface Subcategory {
  id: SubcategoryId;
  categoryId: CategoryId;
  systemKey: string | null;
  name: string | null;
  position: number;
  updatedAt: IsoInstant;
  deletedAt: IsoInstant | null;
}

export interface Tag {
  id: TagId;
  /** Sans le « # » : il est ajouté à l'affichage. */
  name: string;
  updatedAt: IsoInstant;
  deletedAt: IsoInstant | null;
}

export interface Catalog {
  categories: Category[];
  subcategories: Subcategory[];
  tags: Tag[];
}

/** Répond à « cette sous-catégorie appartient-elle à cette catégorie ? ». */
export type SubcategoryLookup = (subcategoryId: SubcategoryId, categoryId: CategoryId) => boolean;

export function createSubcategoryLookup(subcategories: readonly Subcategory[]): SubcategoryLookup {
  const parents = new Map(subcategories.map((sub) => [sub.id, sub.categoryId]));
  return (subcategoryId, categoryId) => parents.get(subcategoryId) === categoryId;
}
