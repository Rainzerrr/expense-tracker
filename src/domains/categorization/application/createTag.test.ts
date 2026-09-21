import { createTestServices } from '@/test/services';
import { ensureDefaultCatalog } from './ensureDefaultCatalog';
import { createTag } from './createTag';

async function setup() {
  const { catalog } = await createTestServices();
  await ensureDefaultCatalog(catalog);
  return catalog;
}

describe('createTag', () => {
  it('crée un tag nouveau avec un nom normalisé', async () => {
    const catalog = await setup();
    const tag = await createTag(catalog, '#Sortie Plage');
    expect(tag?.name).toBe('sortie-plage');
    expect((await catalog.load()).tags.map((t) => t.name)).toContain('sortie-plage');
  });

  it('retrouve un tag existant au lieu de le dupliquer, même écrit autrement', async () => {
    const catalog = await setup();
    const before = (await catalog.load()).tags.length;
    const tag = await createTag(catalog, '#Avec Amis');
    expect(tag?.id).toBe('avec-amis');
    expect((await catalog.load()).tags).toHaveLength(before);
  });

  it('refuse un nom vide', async () => {
    const catalog = await setup();
    expect(await createTag(catalog, ' # ')).toBeNull();
  });
});
