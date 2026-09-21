import { useCallback, useSyncExternalStore } from 'react';

// Absent de jsdom (tests) : on suppose alors un écran de téléphone.
const supportsMatchMedia = () =>
  typeof window !== 'undefined' && typeof window.matchMedia === 'function';

export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (notify: () => void) => {
      if (!supportsMatchMedia()) return () => {};
      const list = window.matchMedia(query);
      list.addEventListener('change', notify);
      return () => list.removeEventListener('change', notify);
    },
    [query],
  );
  return useSyncExternalStore(
    subscribe,
    () => supportsMatchMedia() && window.matchMedia(query).matches,
    () => false,
  );
}
