import type { Catalog, Category, Subcategory, Tag } from '@/domains/categorization';
import type { Expense } from '@/domains/expenses';
import { formatCsvAmount, toCsv } from './csv';

export interface CsvLabels {
  header: readonly string[];
  category: (category: Category) => string;
  subcategory: (subcategory: Subcategory) => string;
  tag: (tag: Tag) => string;
}

/**
 * Une ligne par dépense (les supprimées sont exclues), de la plus ancienne à la plus récente :
 * Date, Montant, Catégorie, Sous-catégorie, Tags, Note (le commerçant d'un import). Les libellés sont ceux que l'utilisateur voit.
 */
export function expensesToCsv(
  expenses: readonly Expense[],
  catalog: Catalog,
  labels: CsvLabels,
): string {
  const sorted = expenses
    .filter((expense) => expense.deletedAt === null)
    .sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt));

  const rows = sorted.map((expense) => {
    const category = catalog.categories.find((c) => c.id === expense.categoryId);
    const subcategory = catalog.subcategories.find((s) => s.id === expense.subcategoryId);
    const tags = expense.tagIds.flatMap((id) => {
      const tag = catalog.tags.find((t) => t.id === id);
      return tag ? [labels.tag(tag)] : [];
    });
    return [
      expense.date,
      formatCsvAmount(expense.amount),
      category ? labels.category(category) : '',
      subcategory ? labels.subcategory(subcategory) : '',
      tags.join(' '),
      expense.note ?? '',
    ];
  });

  return toCsv([labels.header, ...rows]);
}
