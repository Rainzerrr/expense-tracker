import { buildDefaultCatalog } from '../domain/defaultCatalog';
import type { CatalogRepository } from '../domain/CatalogRepository';

/** Au premier lancement, installe les catégories et tags proposés. Ne touche à rien ensuite. */
export async function ensureDefaultCatalog(repository: CatalogRepository): Promise<void> {
  if (await repository.isEmpty()) {
    await repository.save(buildDefaultCatalog());
  }
}
