import type { AppDatabase } from '@/shared/infrastructure/database';
import type { CatalogRepository } from '../domain/CatalogRepository';

export class DexieCatalogRepository implements CatalogRepository {
  constructor(private readonly db: AppDatabase) {}

  async load() {
    const [categories, subcategories, tags] = await Promise.all([
      this.db.categories.orderBy('position').toArray(),
      this.db.subcategories.toArray(),
      this.db.tags.orderBy('name').toArray(),
    ]);
    // Les éléments supprimés restent en base (pour la fusion entre appareils) mais disparaissent des écrans.
    const active = <T extends { deletedAt: unknown }>(items: T[]) =>
      items.filter((item) => item.deletedAt === null);
    return {
      categories: active(categories),
      subcategories: active(subcategories).sort((a, b) => a.position - b.position),
      tags: active(tags),
    };
  }

  async save(changes: Parameters<CatalogRepository['save']>[0]) {
    const { db } = this;
    await db.transaction('rw', db.categories, db.subcategories, db.tags, async () => {
      if (changes.categories) await db.categories.bulkPut(changes.categories);
      if (changes.subcategories) await db.subcategories.bulkPut(changes.subcategories);
      if (changes.tags) await db.tags.bulkPut(changes.tags);
    });
  }

  async isEmpty() {
    return (await this.db.categories.count()) === 0;
  }
}
