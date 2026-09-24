import type { CategoryId, SubcategoryId } from '@/domains/categorization';
import type { MerchantChoice } from '../../domain/importPlan';

export const SKIP_VALUE = 'skip';
export const UNRESOLVED_VALUE = '';

/** Le choix d'un commerçant, sous la forme d'une valeur de `<select>` : « skip », « c:<catégorie> », « s:<sous-catégorie> ». */
export function choiceToValue(choice: MerchantChoice | undefined): string {
  if (!choice) return UNRESOLVED_VALUE;
  if (choice.ignore) return SKIP_VALUE;
  return choice.subcategoryId ? `s:${choice.subcategoryId}` : `c:${choice.categoryId}`;
}

/** L'inverse. Une sous-catégorie retrouve sa catégorie grâce à `parentOf`. */
export function valueToChoice(
  value: string,
  parentOf: (subcategoryId: SubcategoryId) => CategoryId | undefined,
): MerchantChoice | undefined {
  if (value === SKIP_VALUE) return { ignore: true };
  if (value.startsWith('c:'))
    return { ignore: false, categoryId: value.slice(2) as CategoryId, subcategoryId: null };
  if (value.startsWith('s:')) {
    const subcategoryId = value.slice(2) as SubcategoryId;
    const categoryId = parentOf(subcategoryId);
    return categoryId ? { ignore: false, categoryId, subcategoryId } : undefined;
  }
  return undefined;
}
