import type { IconName } from '@/shared/ui/atoms/Icon';
import type { Category } from '../domain/category';

const ICONS: Record<string, IconName> = {
  housing: 'home',
  groceries: 'basket',
  activities: 'smile',
  transport: 'tram',
  travel: 'plane',
  subscriptions: 'repeat',
  health: 'heart',
  shopping: 'bag',
  misc: 'dots',
};

/** Icône d'une catégorie fournie par défaut ; une catégorie créée par l'utilisateur a l'étiquette. */
export function categoryIcon(category: Category): IconName {
  return (category.systemKey && ICONS[category.systemKey]) || 'tag';
}
