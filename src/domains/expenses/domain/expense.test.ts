import { buildDefaultCatalog, createSubcategoryLookup } from '@/domains/categorization';
import type { CategoryId, SubcategoryId } from '@/domains/categorization';
import type { IsoInstant } from '@/shared/lib/time';
import { createExpense, reviseExpense } from './expense';
import type { ExpenseId, ExpenseInput } from './expense';

const isSubcategoryOf = createSubcategoryLookup(buildDefaultCatalog().subcategories);
const context = {
  id: 'expense-1' as ExpenseId,
  now: '2026-09-20T10:00:00.000Z' as IsoInstant,
  isSubcategoryOf,
};

const validInput: ExpenseInput = {
  amount: 1240,
  categoryId: 'groceries' as CategoryId,
  subcategoryId: 'groceries.meat' as SubcategoryId,
  tagIds: [],
  date: '2026-09-20',
};

describe('createExpense', () => {
  it('crée une dépense valide, non supprimée', () => {
    const result = createExpense(validInput, context);
    expect(result).toMatchObject({
      ok: true,
      expense: {
        id: 'expense-1',
        amount: 1240,
        date: '2026-09-20',
        createdAt: context.now,
        updatedAt: context.now,
        deletedAt: null,
      },
    });
  });

  it('accepte une dépense sans sous-catégorie', () => {
    expect(createExpense({ ...validInput, subcategoryId: null }, context).ok).toBe(true);
  });

  it.each([0, -100, 12.5, Number.NaN])('refuse le montant %s', (amount) => {
    expect(createExpense({ ...validInput, amount }, context)).toEqual({
      ok: false,
      error: 'invalidAmount',
    });
  });

  it.each(['2026-02-30', '20/09/2026', ''])('refuse la date %j', (date) => {
    expect(createExpense({ ...validInput, date }, context)).toEqual({
      ok: false,
      error: 'invalidDate',
    });
  });

  it('refuse une sous-catégorie qui appartient à une autre catégorie', () => {
    const input = { ...validInput, categoryId: 'transport' as CategoryId };
    expect(createExpense(input, context)).toEqual({ ok: false, error: 'subcategoryMismatch' });
  });

  it('refuse une sous-catégorie inconnue', () => {
    const input = { ...validInput, subcategoryId: 'groceries.nope' as SubcategoryId };
    expect(createExpense(input, context)).toEqual({ ok: false, error: 'subcategoryMismatch' });
  });

  it('retire les tags en double', () => {
    const tagIds = ['avec-amis', 'cash', 'avec-amis'] as never[];
    const result = createExpense({ ...validInput, tagIds }, context);
    expect(result.ok && result.expense.tagIds).toEqual(['avec-amis', 'cash']);
  });
});

describe('reviseExpense', () => {
  it("conserve l'identité et la date de création, met à jour le reste", () => {
    const created = createExpense(validInput, context);
    if (!created.ok) throw new Error('création attendue');

    const later = '2026-09-21T08:00:00.000Z' as IsoInstant;
    const revised = reviseExpense(
      created.expense,
      { ...validInput, amount: 1500, date: '2026-09-19' },
      { now: later, isSubcategoryOf },
    );

    expect(revised).toMatchObject({
      ok: true,
      expense: {
        id: 'expense-1',
        amount: 1500,
        date: '2026-09-19',
        createdAt: context.now,
        updatedAt: later,
      },
    });
  });

  it('applique les mêmes règles que la création', () => {
    const created = createExpense(validInput, context);
    if (!created.ok) throw new Error('création attendue');
    expect(reviseExpense(created.expense, { ...validInput, amount: 0 }, context)).toEqual({
      ok: false,
      error: 'invalidAmount',
    });
  });
});
