import { newId } from '@/shared/lib/ids';
import { nowInstant } from '@/shared/lib/time';
import type { CatalogRepository } from '../domain/CatalogRepository';
import type { Tag, TagId } from '../domain/category';
import { normalizeTagName } from '../domain/normalizeTagName';

/** Crée un tag, ou retrouve celui qui existe déjà avec ce nom. Null si le nom est inutilisable. */
export async function createTag(
  catalog: CatalogRepository,
  rawName: string,
  now: Date = new Date(),
): Promise<Tag | null> {
  const name = normalizeTagName(rawName);
  if (name === null) return null;

  const { tags } = await catalog.load();
  const existing = tags.find((tag) => tag.name === name);
  if (existing) return existing;

  const tag: Tag = { id: newId() as TagId, name, updatedAt: nowInstant(now), deletedAt: null };
  await catalog.save({ tags: [tag] });
  return tag;
}
