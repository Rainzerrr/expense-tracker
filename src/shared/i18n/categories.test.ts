import { buildDefaultCatalog } from '@/domains/categorization';
import categories from './locales/fr/categories.json';

type Translations = Record<string, { label: string; sub: Record<string, string> }>;
const translations: Translations = categories;

describe('traductions des catégories par défaut', () => {
  const catalog = buildDefaultCatalog();

  it('chaque catégorie fournie a un libellé', () => {
    for (const category of catalog.categories) {
      expect(translations[category.systemKey ?? ''], category.id).toBeDefined();
    }
  });

  it('chaque sous-catégorie fournie a un libellé', () => {
    for (const sub of catalog.subcategories) {
      const parentKey = sub.categoryId;
      expect(translations[parentKey]?.sub[sub.systemKey ?? ''], sub.id).toBeTruthy();
    }
  });

  it('ne contient aucune traduction orpheline', () => {
    const subIds = new Set(catalog.subcategories.map((s) => s.id));
    for (const [categoryKey, entry] of Object.entries(translations)) {
      for (const subKey of Object.keys(entry.sub)) {
        expect(subIds.has(`${categoryKey}.${subKey}` as never), `${categoryKey}.${subKey}`).toBe(
          true,
        );
      }
    }
  });
});
