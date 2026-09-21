import { useEffect, useRef, useState } from 'react';

/**
 * Largeur réelle d'un élément, suivie quand il change de taille. Sert à dessiner un graphique
 * à sa taille exacte (les textes gardent leur corps) plutôt que de l'agrandir comme une image.
 * `fallback` : valeur avant la première mesure, et dans les tests (pas de ResizeObserver).
 */
export function useContainerWidth<T extends HTMLElement>(fallback: number) {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(fallback);

  useEffect(() => {
    const element = ref.current;
    if (!element || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setWidth(Math.round(entry.contentRect.width));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return [ref, width] as const;
}
