import { buildDefaultCatalog } from '@/domains/categorization';
import type { CategoryId, SubcategoryId, TagId } from '@/domains/categorization';
import type { Expense, ExpenseId } from '@/domains/expenses';
import type { IsoInstant, LocalDate } from '@/shared/lib/time';
import { expensesToCsv } from './expenseCsv';

const BOM = String.fromCharCode(0xfeff);
const catalog = buildDefaultCatalog();
const labels = {
  header: ['Date', 'Montant', 'Catégorie', 'Sous-catégorie', 'Tags'],
  category: (c: { id: string }) => (c.id === 'groceries' ? 'Courses' : c.id),
  subcategory: (s: { id: string }) => (s.id === 'groceries.meat' ? 'Viande' : s.id),
  tag: (t: { name: string }) => `#${t.name}`,
};

function spend(
  id: string,
  date: string,
  amount: number,
  overrides: Partial<Expense> = {},
): Expense {
  return {
    id: id as ExpenseId,
    amount: amount as Expense['amount'],
    categoryId: 'groceries' as CategoryId,
    subcategoryId: 'groceries.meat' as SubcategoryId,
    tagIds: [],
    date: date as LocalDate,
    createdAt: '2026-09-20T10:00:00.000Z' as IsoInstant,
    updatedAt: '2026-09-20T10:00:00.000Z' as IsoInstant,
    deletedAt: null,
    ...overrides,
  };
}

describe('expensesToCsv', () => {
  it('écrit une ligne par dépense avec les libellés visibles, du plus ancien au plus récent', () => {
    const csv = expensesToCsv(
      [
        spend('b', '2026-09-20', 1240),
        spend('a', '2026-09-19', 1850, { tagIds: ['avec-amis' as TagId, 'cash' as TagId] }),
      ],
      catalog,
      labels,
    );
    expect(csv).toBe(
      `${BOM}Date;Montant;Catégorie;Sous-catégorie;Tags\r\n` +
        '2026-09-19;18,50;Courses;Viande;#avec-amis #cash\r\n' +
        '2026-09-20;12,40;Courses;Viande;\r\n',
    );
  });

  it('exclut les dépenses supprimées', () => {
    const deleted = spend('x', '2026-09-20', 999, {
      deletedAt: '2026-09-21T00:00:00.000Z' as IsoInstant,
    });
    const csv = expensesToCsv([deleted, spend('ok', '2026-09-20', 100)], catalog, labels);
    expect(csv).not.toContain('9,99');
    expect(csv).toContain('1,00');
  });

  it('laisse la sous-catégorie vide quand il n’y en a pas', () => {
    const csv = expensesToCsv(
      [spend('a', '2026-09-20', 500, { subcategoryId: null })],
      catalog,
      labels,
    );
    expect(csv).toContain('2026-09-20;5,00;Courses;;');
  });

  it('sans dépense, ne contient que l’en-tête', () => {
    expect(expensesToCsv([], catalog, labels)).toBe(
      `${BOM}Date;Montant;Catégorie;Sous-catégorie;Tags\r\n`,
    );
  });
});
