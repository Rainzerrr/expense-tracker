import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { Category, Subcategory, Tag } from '../domain/category';

/**
 * Libellés d'affichage : le nom choisi par l'utilisateur s'il existe, sinon la traduction
 * de la clé système. Les clés sont composées à l'exécution, d'où l'appel non typé de `t`.
 */
export function useCatalogLabels() {
  const { t } = useTranslation('categories');
  return useMemo(() => {
    const translate = (key: string): string => t(key as never);
    return {
      category: (category: Category) => category.name ?? translate(`${category.systemKey}.label`),
      // Une sous-catégorie fournie par défaut appartient à la catégorie du même nom que sa clé.
      subcategory: (sub: Subcategory) =>
        sub.name ?? translate(`${sub.categoryId}.sub.${sub.systemKey}`),
      tag: (tag: Tag) => `#${tag.name}`,
    };
  }, [t]);
}
