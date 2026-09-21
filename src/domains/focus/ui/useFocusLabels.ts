import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import type { Catalog } from '@/domains/categorization';
import { useCatalogLabels } from '@/domains/categorization/react';
import type { FocusTarget } from '../domain/focus';

export interface FocusDescription {
  /** « Viande », « Transport », « #avec-amis ». */
  name: string;
  /** « Courses › Viande », « Catégorie entière », « Tag ». */
  subtitle: string;
  /** Valeur CSS de la couleur (celle de la catégorie ; l'accent pour un tag). */
  color: string;
}

/** Comment nommer et colorer un focus. Null si sa cible n'existe plus : il n'est alors pas affiché. */
export function useFocusLabels(catalog: Catalog | undefined) {
  const labels = useCatalogLabels();
  const { t } = useTranslation('focus');

  return useCallback(
    (target: FocusTarget): FocusDescription | null => {
      if (!catalog) return null;

      if (target.kind === 'category') {
        const category = catalog.categories.find((c) => c.id === target.targetId);
        if (!category) return null;
        return {
          name: labels.category(category),
          subtitle: t('cards.wholeCategory'),
          color: `var(--category-${category.color})`,
        };
      }

      if (target.kind === 'subcategory') {
        const subcategory = catalog.subcategories.find((s) => s.id === target.targetId);
        const category = catalog.categories.find((c) => c.id === subcategory?.categoryId);
        if (!subcategory || !category) return null;
        const name = labels.subcategory(subcategory);
        return {
          name,
          subtitle: `${labels.category(category)} › ${name}`,
          color: `var(--category-${category.color})`,
        };
      }

      const tag = catalog.tags.find((item) => item.id === target.targetId);
      if (!tag) return null;
      return { name: labels.tag(tag), subtitle: t('cards.tag'), color: 'var(--color-accent)' };
    },
    [catalog, labels, t],
  );
}
