export { CATEGORY_COLORS, createSubcategoryLookup } from './domain/category';
export type {
  Catalog,
  Category,
  CategoryColor,
  CategoryId,
  Subcategory,
  SubcategoryId,
  SubcategoryLookup,
  Tag,
  TagId,
} from './domain/category';
export {
  buildDefaultCatalog,
  categoryIdFor,
  FIXED_CATEGORY_IDS,
  subcategoryIdFor,
  tagIdFor,
} from './domain/defaultCatalog';
export type { CatalogRepository } from './domain/CatalogRepository';
export { ensureDefaultCatalog } from './application/ensureDefaultCatalog';
export { createTag } from './application/createTag';
export { normalizeTagName } from './domain/normalizeTagName';
