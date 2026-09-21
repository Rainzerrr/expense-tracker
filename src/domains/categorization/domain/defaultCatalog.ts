import type {
  Catalog,
  Category,
  CategoryColor,
  CategoryId,
  Subcategory,
  SubcategoryId,
  Tag,
  TagId,
} from './category';
import { EPOCH_INSTANT } from '@/shared/lib/time';

interface DefaultCategory {
  key: string;
  color: CategoryColor;
  subcategories: readonly string[];
}

// Proposition de départ issue des maquettes, entièrement modifiable ensuite.
const DEFAULT_CATEGORIES: readonly DefaultCategory[] = [
  {
    key: 'housing',
    color: 'housing',
    subcategories: ['rent', 'utilities', 'deposit', 'homeEquipment'],
  },
  {
    key: 'groceries',
    color: 'groceries',
    subcategories: [
      'meat',
      'fish',
      'fruitsVegetables',
      'bakery',
      'dairyEggs',
      'staples',
      'drinks',
      'snacks',
      'hygiene',
    ],
  },
  {
    key: 'activities',
    color: 'activities',
    subcategories: ['restaurants', 'cafes', 'bars', 'excursions', 'culture', 'sports', 'esnEvents'],
  },
  {
    key: 'transport',
    color: 'transport',
    subcategories: ['navegante', 'singleTickets', 'train', 'rideshare', 'bikeScooter'],
  },
  {
    key: 'travel',
    color: 'travel',
    subcategories: ['flights', 'lodging', 'localTransport', 'mealsOutings'],
  },
  {
    key: 'subscriptions',
    color: 'subscriptions',
    subcategories: ['phone', 'streaming', 'apps', 'bankFees'],
  },
  {
    key: 'health',
    color: 'health',
    subcategories: ['pharmacy', 'doctor', 'healthInsurance'],
  },
  {
    key: 'shopping',
    color: 'shopping',
    subcategories: ['clothes', 'electronics', 'gifts', 'other'],
  },
  {
    key: 'misc',
    color: 'misc',
    subcategories: ['studySupplies', 'admin', 'unexpected', 'other'],
  },
];

const DEFAULT_TAG_NAMES = ['avec-amis', 'soirée-esn', 'petit-plaisir', 'imprévu', 'cash'];

/** Pour une catégorie fournie par défaut, l'identifiant est sa clé système : stable et lisible. */
export const categoryIdFor = (key: string) => key as CategoryId;
export const subcategoryIdFor = (categoryKey: string, key: string) =>
  `${categoryKey}.${key}` as SubcategoryId;
/** Les tags par défaut ont pour identifiant leur nom. */
export const tagIdFor = (name: string) => name as TagId;

/** Le loyer est payé le 1er du mois : ces catégories sont exclues de la moyenne quotidienne. */
export const FIXED_CATEGORY_IDS: readonly CategoryId[] = [categoryIdFor('housing')];

export function buildDefaultCatalog(): Catalog {
  const categories: Category[] = [];
  const subcategories: Subcategory[] = [];

  DEFAULT_CATEGORIES.forEach((category, categoryIndex) => {
    const categoryId = categoryIdFor(category.key);
    categories.push({
      id: categoryId,
      systemKey: category.key,
      name: null,
      color: category.color,
      position: categoryIndex,
      updatedAt: EPOCH_INSTANT,
      deletedAt: null,
    });
    category.subcategories.forEach((key, subIndex) => {
      subcategories.push({
        id: subcategoryIdFor(category.key, key),
        categoryId,
        systemKey: key,
        name: null,
        position: subIndex,
        updatedAt: EPOCH_INSTANT,
        deletedAt: null,
      });
    });
  });

  const tags: Tag[] = DEFAULT_TAG_NAMES.map((name) => ({
    id: tagIdFor(name),
    name,
    updatedAt: EPOCH_INSTANT,
    deletedAt: null,
  }));

  return { categories, subcategories, tags };
}
