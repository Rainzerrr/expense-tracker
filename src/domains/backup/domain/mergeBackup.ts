import type { Category, Subcategory, Tag, TagId } from '@/domains/categorization';
import type { Expense } from '@/domains/expenses';
import { sameTarget } from '@/domains/focus';
import type { Focus } from '@/domains/focus';
import type { IsoInstant } from '@/shared/lib/time';
import type { BackupData } from './backupFile';

export interface MergeSummary {
  expenses: {
    /** Dépenses inconnues de cet appareil (et non supprimées). */
    added: number;
    /** Dépenses modifiées ailleurs, plus récentes que la version locale. */
    updated: number;
    /** Dépenses supprimées ailleurs. */
    deleted: number;
    /** Déjà à jour ici. */
    unchanged: number;
    /** Ignorées : elles pointent vers une catégorie ou sous-catégorie introuvable. */
    skipped: number;
  };
  /** Catégories, sous-catégories, tags et focus. */
  catalog: { added: number; updated: number };
}

export interface MergePlan {
  /** Ce qu'il faut écrire dans la base : uniquement ce qui change. */
  toWrite: BackupData;
  summary: MergeSummary;
}

interface Versioned {
  id: string;
  updatedAt: IsoInstant;
  deletedAt: IsoInstant | null;
}

interface Counts {
  added: number;
  updated: number;
  deleted: number;
  unchanged: number;
}

/** La version la plus récente (`updatedAt`) l'emporte, enregistrement par enregistrement. */
function mergeById<T extends Versioned>(local: readonly T[], incoming: readonly T[]) {
  const localById = new Map(local.map((item) => [item.id, item]));
  const toWrite: T[] = [];
  const counts: Counts = { added: 0, updated: 0, deleted: 0, unchanged: 0 };

  for (const item of incoming) {
    const existing = localById.get(item.id);
    if (!existing) {
      // Inconnu ici. Une suppression jamais vue est tout de même conservée (elle protège d'un retour).
      toWrite.push(item);
      if (item.deletedAt === null) counts.added += 1;
      continue;
    }
    if (item.updatedAt <= existing.updatedAt) {
      counts.unchanged += 1;
      continue;
    }
    toWrite.push(item);
    if (item.deletedAt !== null && existing.deletedAt === null) counts.deleted += 1;
    else if (item.deletedAt === null) counts.updated += 1;
  }
  return { toWrite, counts };
}

/**
 * Fusionne les données d'un autre appareil dans les données locales, sans jamais rien perdre :
 * - chaque enregistrement garde sa version la plus récente ;
 * - les suppressions se propagent (elles sont des enregistrements comme les autres) ;
 * - deux tags de même nom créés séparément sur chaque appareil n'en font plus qu'un ;
 * - une dépense qui pointe vers une catégorie inconnue est ignorée plutôt que d'abîmer la base.
 */
export function mergeBackup(local: BackupData, incoming: BackupData): MergePlan {
  // 1. Tags : un tag entrant de même nom qu'un tag local (id différent) est le même tag.
  const localTagIds = new Set(local.tags.map((tag) => tag.id));
  const localTagByName = new Map(
    local.tags.filter((t) => t.deletedAt === null).map((t) => [t.name, t]),
  );
  const tagRemap = new Map<string, TagId>();
  const incomingTags: Tag[] = [];
  for (const tag of incoming.tags) {
    const twin = localTagByName.get(tag.name);
    if (!localTagIds.has(tag.id) && tag.deletedAt === null && twin) tagRemap.set(tag.id, twin.id);
    else incomingTags.push(tag);
  }

  // Focus : deux appareils ayant épinglé la même cible sous deux identifiants n'en gardent qu'un.
  const localFocusIds = new Set(local.focuses.map((focus) => focus.id));
  const localActiveFocuses = local.focuses.filter((focus) => focus.deletedAt === null);
  const incomingFocuses = incoming.focuses.filter(
    (focus) =>
      localFocusIds.has(focus.id) ||
      focus.deletedAt !== null ||
      !localActiveFocuses.some((twin) => sameTarget(twin, focus)),
  );

  // 2. Catalogue.
  const categories = mergeById<Category>(local.categories, incoming.categories);
  const subcategories = mergeById<Subcategory>(local.subcategories, incoming.subcategories);
  const tags = mergeById<Tag>(local.tags, incomingTags);
  const focuses = mergeById<Focus>(local.focuses, incomingFocuses);

  // 3. Dépenses : on répare les tags renvoyés vers leur jumeau, puis on vérifie les références.
  const knownCategoryIds = new Set([...local.categories, ...incoming.categories].map((c) => c.id));
  const knownSubcategoryIds = new Set(
    [...local.subcategories, ...incoming.subcategories].map((s) => s.id),
  );
  const knownTagIds = new Set([...local.tags, ...incomingTags].map((t) => t.id as string));

  let skipped = 0;
  const usableExpenses: Expense[] = [];
  for (const expense of incoming.expenses) {
    const categoryOk = knownCategoryIds.has(expense.categoryId);
    const subcategoryOk =
      expense.subcategoryId === null || knownSubcategoryIds.has(expense.subcategoryId);
    if (!categoryOk || !subcategoryOk) {
      skipped += 1;
      continue;
    }
    const tagIds = [...new Set(expense.tagIds.map((id) => tagRemap.get(id) ?? id))].filter((id) =>
      knownTagIds.has(id),
    ) as TagId[];
    usableExpenses.push({ ...expense, tagIds });
  }
  const expenses = mergeById<Expense>(local.expenses, usableExpenses);

  return {
    toWrite: {
      expenses: expenses.toWrite,
      categories: categories.toWrite,
      subcategories: subcategories.toWrite,
      tags: tags.toWrite,
      focuses: focuses.toWrite,
    },
    summary: {
      expenses: { ...expenses.counts, skipped },
      catalog: {
        added:
          categories.counts.added +
          subcategories.counts.added +
          tags.counts.added +
          focuses.counts.added,
        updated:
          categories.counts.updated +
          categories.counts.deleted +
          subcategories.counts.updated +
          subcategories.counts.deleted +
          tags.counts.updated +
          tags.counts.deleted +
          focuses.counts.updated +
          focuses.counts.deleted,
      },
    },
  };
}

/** Vrai si l'import changerait quelque chose. */
export function hasChanges({ expenses, catalog }: MergeSummary): boolean {
  return expenses.added + expenses.updated + expenses.deleted + catalog.added + catalog.updated > 0;
}
