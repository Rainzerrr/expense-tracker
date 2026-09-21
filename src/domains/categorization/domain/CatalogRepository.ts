import type { Catalog } from './category';

export interface CatalogRepository {
  /** Catégories et sous-catégories triées par position, tags par nom. */
  load(): Promise<Catalog>;
  /** Crée ou remplace les éléments donnés. */
  save(changes: Partial<Catalog>): Promise<void>;
  isEmpty(): Promise<boolean>;
}
