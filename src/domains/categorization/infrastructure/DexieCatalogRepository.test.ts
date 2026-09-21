import { AppDatabase } from '@/shared/infrastructure/database';
import { ensureDefaultCatalog } from '../application/ensureDefaultCatalog';
import { buildDefaultCatalog } from '../domain/defaultCatalog';
import { DexieCatalogRepository } from './DexieCatalogRepository';

let db: AppDatabase;
let repository: DexieCatalogRepository;

beforeEach(() => {
  db = new AppDatabase(`test-${crypto.randomUUID()}`);
  repository = new DexieCatalogRepository(db);
});
afterEach(async () => {
  await db.delete();
});

describe('ensureDefaultCatalog', () => {
  it('installe le catalogue au premier lancement', async () => {
    expect(await repository.isEmpty()).toBe(true);
    await ensureDefaultCatalog(repository);
    const catalog = await repository.load();
    expect(catalog.categories).toHaveLength(9);
    expect(catalog.categories.map((c) => c.id)[0]).toBe('housing');
    expect(catalog.tags.map((t) => t.name)).toContain('avec-amis');
  });

  it('ne réécrit pas un catalogue que l’utilisateur a modifié', async () => {
    await ensureDefaultCatalog(repository);
    const [first] = (await repository.load()).categories;
    if (!first) throw new Error('catégorie attendue');
    await repository.save({ categories: [{ ...first, name: 'Chez moi' }] });

    await ensureDefaultCatalog(repository);
    expect((await repository.load()).categories[0]?.name).toBe('Chez moi');
  });

  it('retourne les sous-catégories dans l’ordre de leur position', async () => {
    await repository.save(buildDefaultCatalog());
    const { subcategories } = await repository.load();
    const groceries = subcategories.filter((s) => s.categoryId === 'groceries');
    expect(groceries.map((s) => s.systemKey).slice(0, 3)).toEqual([
      'meat',
      'fish',
      'fruitsVegetables',
    ]);
  });
});
