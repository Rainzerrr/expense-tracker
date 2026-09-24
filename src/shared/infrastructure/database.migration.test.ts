import Dexie from 'dexie';
import { AppDatabase } from './database';

// Une base créée par l'ancienne version (v1, sans updatedAt/deletedAt sur le catalogue).
async function createV1Database(name: string) {
  const v1 = new Dexie(name);
  v1.version(1).stores({
    expenses: 'id, date, categoryId, subcategoryId, *tagIds',
    categories: 'id, position',
    subcategories: 'id, categoryId',
    tags: 'id, name',
  });
  await v1
    .table('categories')
    .add({ id: 'groceries', systemKey: 'groceries', name: null, color: 'groceries', position: 1 });
  await v1.table('subcategories').add({
    id: 'groceries.meat',
    categoryId: 'groceries',
    systemKey: 'meat',
    name: null,
    position: 0,
  });
  await v1.table('tags').add({ id: 'cash', name: 'cash' });
  await v1.table('expenses').add({
    id: 'e1',
    amount: 1240,
    categoryId: 'groceries',
    subcategoryId: null,
    tagIds: [],
    date: '2026-09-20',
    createdAt: '2026-09-20T10:00:00.000Z',
    updatedAt: '2026-09-20T10:00:00.000Z',
    deletedAt: null,
  });
  v1.close();
}

describe('migration de la base v1 → v2', () => {
  it('ajoute updatedAt et deletedAt au catalogue sans toucher aux données', async () => {
    const name = `migration-${crypto.randomUUID()}`;
    await createV1Database(name);

    const db = new AppDatabase(name);
    await db.open();

    expect(await db.categories.get('groceries' as never)).toMatchObject({
      name: null,
      updatedAt: '1970-01-01T00:00:00.000Z',
      deletedAt: null,
    });
    expect(await db.subcategories.get('groceries.meat' as never)).toMatchObject({
      deletedAt: null,
    });
    expect(await db.tags.get('cash' as never)).toMatchObject({
      name: 'cash',
      updatedAt: '1970-01-01T00:00:00.000Z',
      deletedAt: null,
    });
    // Les dépenses sont intactes.
    expect(await db.expenses.get('e1' as never)).toMatchObject({
      amount: 1240,
      date: '2026-09-20',
    });
    // Les tables ajoutées ensuite existent (meta en v2, focuses en v3, merchantRules en v4, budget en v5).
    expect(await db.focuses.count()).toBe(0);
    expect(await db.merchantRules.count()).toBe(0);
    expect(await db.budget.count()).toBe(0);
    await db.meta.put({ key: 'test', value: '1' });
    expect((await db.meta.get('test'))?.value).toBe('1');

    await db.delete();
  });
});
