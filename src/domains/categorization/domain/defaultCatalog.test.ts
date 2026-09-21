import { createSubcategoryLookup } from './category';
import type { CategoryColor } from './category';
import { buildDefaultCatalog, FIXED_CATEGORY_IDS } from './defaultCatalog';

describe('buildDefaultCatalog', () => {
  const catalog = buildDefaultCatalog();

  it('propose les 9 catégories des maquettes, chacune avec sa couleur', () => {
    expect(catalog.categories.map((c) => c.systemKey)).toEqual([
      'housing',
      'groceries',
      'activities',
      'transport',
      'travel',
      'subscriptions',
      'health',
      'shopping',
      'misc',
    ]);
    const colors = catalog.categories.map((c) => c.color);
    expect(new Set<CategoryColor>(colors).size).toBe(9);
  });

  it('a des identifiants uniques', () => {
    const ids = [
      ...catalog.categories.map((c) => c.id),
      ...catalog.subcategories.map((s) => s.id),
      ...catalog.tags.map((t) => t.id),
    ];
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('rattache chaque sous-catégorie à une catégorie existante', () => {
    const categoryIds = new Set(catalog.categories.map((c) => c.id));
    expect(catalog.subcategories.every((s) => categoryIds.has(s.categoryId))).toBe(true);
    const isSubcategoryOf = createSubcategoryLookup(catalog.subcategories);
    expect(isSubcategoryOf('groceries.meat' as never, 'groceries' as never)).toBe(true);
    expect(isSubcategoryOf('groceries.meat' as never, 'transport' as never)).toBe(false);
  });

  it('le logement est la seule catégorie fixe', () => {
    expect(FIXED_CATEGORY_IDS).toEqual(['housing']);
  });
});
