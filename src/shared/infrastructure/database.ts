import Dexie from 'dexie';
import type { EntityTable } from 'dexie';
import type { Category, Subcategory, Tag } from '@/domains/categorization';
import type { Expense } from '@/domains/expenses';
import type { Focus } from '@/domains/focus';
import { EPOCH_INSTANT } from '@/shared/lib/time';

export const DATABASE_NAME = 'expense-tracker';
/** Base distincte : les données de démo ne se mélangent jamais aux vraies. */
export const DEMO_DATABASE_NAME = 'expense-tracker-demo';

/** Petits réglages techniques (dernière sauvegarde, dernier import…). */
export interface MetaEntry {
  key: string;
  value: string;
}

export class AppDatabase extends Dexie {
  expenses!: EntityTable<Expense, 'id'>;
  categories!: EntityTable<Category, 'id'>;
  subcategories!: EntityTable<Subcategory, 'id'>;
  tags!: EntityTable<Tag, 'id'>;
  meta!: EntityTable<MetaEntry, 'key'>;
  focuses!: EntityTable<Focus, 'id'>;

  constructor(name: string) {
    super(name);
    // Seuls les champs interrogés sont indexés. `deletedAt` ne l'est pas : IndexedDB
    // n'indexe pas `null`, on filtre donc en mémoire sur un mois de dépenses.
    this.version(1).stores({
      expenses: 'id, date, categoryId, subcategoryId, *tagIds',
      categories: 'id, position',
      subcategories: 'id, categoryId',
      tags: 'id, name',
    });
    // v2 : les catégories, sous-catégories et tags gagnent `updatedAt` / `deletedAt` (fusion entre
    // appareils), et une table `meta`. Les données existantes reçoivent la date d'époque : elles
    // sont identiques sur tous les appareils, et toute modification ultérieure sera plus récente.
    this.version(2)
      .stores({
        expenses: 'id, date, categoryId, subcategoryId, *tagIds',
        categories: 'id, position',
        subcategories: 'id, categoryId',
        tags: 'id, name',
        meta: 'key',
      })
      .upgrade(async (transaction) => {
        for (const table of ['categories', 'subcategories', 'tags']) {
          await transaction
            .table(table)
            .toCollection()
            .modify((record: { updatedAt?: string; deletedAt?: string | null }) => {
              record.updatedAt ??= EPOCH_INSTANT;
              record.deletedAt ??= null;
            });
        }
      });
    // v3 : les focus épinglés (catégorie, sous-catégorie ou tag suivi de près).
    this.version(3).stores({
      expenses: 'id, date, categoryId, subcategoryId, *tagIds',
      categories: 'id, position',
      subcategories: 'id, categoryId',
      tags: 'id, name',
      meta: 'key',
      focuses: 'id, position',
    });
  }
}
