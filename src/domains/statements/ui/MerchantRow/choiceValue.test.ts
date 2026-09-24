import type { CategoryId, SubcategoryId } from '@/domains/categorization';
import { choiceToValue, valueToChoice } from './choiceValue';

const parentOf = (id: SubcategoryId) =>
  id.startsWith('groceries.') ? ('groceries' as CategoryId) : undefined;

describe('choiceToValue / valueToChoice', () => {
  it.each([
    [{ ignore: true as const }, 'skip'],
    [
      { ignore: false as const, categoryId: 'shopping' as CategoryId, subcategoryId: null },
      'c:shopping',
    ],
    [
      {
        ignore: false as const,
        categoryId: 'groceries' as CategoryId,
        subcategoryId: 'groceries.meat' as SubcategoryId,
      },
      's:groceries.meat',
    ],
  ])('fait l’aller-retour pour %j', (choice, value) => {
    expect(choiceToValue(choice)).toBe(value);
    expect(valueToChoice(value, parentOf)).toEqual(choice);
  });

  it('un commerçant sans choix reste sans choix', () => {
    expect(choiceToValue(undefined)).toBe('');
    expect(valueToChoice('', parentOf)).toBeUndefined();
  });

  it('refuse une sous-catégorie dont la catégorie est introuvable', () => {
    expect(valueToChoice('s:inconnue.x', parentOf)).toBeUndefined();
  });
});
