import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

const QUERY = 'q';
const CATEGORY = 'category';
const TAG = 'tag';

/** Recherche et filtres, mémorisés dans l'adresse : partageables, et le bouton retour les conserve. */
export function useHistoryFilters() {
  const [params, setParams] = useSearchParams();

  const set = useCallback(
    (key: string, value: string) =>
      setParams(
        (current) => {
          const next = new URLSearchParams(current);
          if (value === '') next.delete(key);
          else next.set(key, value);
          return next;
        },
        // On ne remplit pas l'historique du navigateur à chaque lettre tapée.
        { replace: true },
      ),
    [setParams],
  );

  const clear = useCallback(
    () =>
      setParams(
        (current) => {
          const next = new URLSearchParams(current);
          for (const key of [QUERY, CATEGORY, TAG]) next.delete(key);
          return next;
        },
        { replace: true },
      ),
    [setParams],
  );

  const query = params.get(QUERY) ?? '';
  const categoryId = params.get(CATEGORY) ?? '';
  const tagId = params.get(TAG) ?? '';

  return {
    query,
    categoryId,
    tagId,
    hasActiveFilters: query.trim() !== '' || categoryId !== '' || tagId !== '',
    setQuery: (value: string) => set(QUERY, value),
    setCategory: (value: string) => set(CATEGORY, value),
    setTag: (value: string) => set(TAG, value),
    clear,
  };
}
