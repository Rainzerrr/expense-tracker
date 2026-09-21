import { useLiveQuery } from 'dexie-react-hooks';
import { useAppServices } from '@/app/AppServices';
import type { Catalog } from '../domain/category';

/** Catalogue toujours à jour : se recalcule quand une catégorie ou un tag change. */
export function useCatalog(): Catalog | undefined {
  const { catalog } = useAppServices();
  return useLiveQuery(() => catalog.load(), [catalog]);
}
