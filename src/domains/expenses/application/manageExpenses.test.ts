import { ensureDefaultCatalog } from '@/domains/categorization';
import type { CategoryId, SubcategoryId } from '@/domains/categorization';
import { createTestServices } from '@/test/services';
import { addExpense } from './addExpense';
import { deleteExpense, restoreExpense } from './deleteExpense';
import { updateExpense } from './updateExpense';
import type { ExpenseId, ExpenseInput } from '../domain/expense';

const input: ExpenseInput = {
  amount: 1850,
  categoryId: 'activities' as CategoryId,
  subcategoryId: 'activities.restaurants' as SubcategoryId,
  tagIds: [],
  date: '2026-09-19',
};

async function setup() {
  const services = await createTestServices();
  await ensureDefaultCatalog(services.catalog);
  const added = await addExpense(services, input, new Date('2026-09-19T20:00:00Z'));
  if (!added.ok) throw new Error('création attendue');
  return { services, id: added.expense.id };
}

describe('updateExpense', () => {
  it('modifie la dépense en gardant son identité et sa date de création', async () => {
    const { services, id } = await setup();
    const result = await updateExpense(
      services,
      id,
      { ...input, amount: 2000, date: '2026-09-18' },
      new Date('2026-09-20T09:00:00Z'),
    );
    expect(result.ok).toBe(true);
    expect(await services.expenses.findById(id)).toMatchObject({
      id,
      amount: 2000,
      date: '2026-09-18',
      createdAt: '2026-09-19T20:00:00.000Z',
      updatedAt: '2026-09-20T09:00:00.000Z',
    });
  });

  it('refuse une modification invalide sans toucher aux données', async () => {
    const { services, id } = await setup();
    const result = await updateExpense(services, id, { ...input, amount: 0 });
    expect(result).toEqual({ ok: false, error: 'invalidAmount' });
    expect((await services.expenses.findById(id))?.amount).toBe(1850);
  });

  it('refuse une sous-catégorie qui n’appartient plus à la catégorie choisie', async () => {
    const { services, id } = await setup();
    const result = await updateExpense(services, id, {
      ...input,
      categoryId: 'transport' as CategoryId,
    });
    expect(result).toEqual({ ok: false, error: 'subcategoryMismatch' });
  });

  it('signale une dépense introuvable', async () => {
    const { services } = await setup();
    const result = await updateExpense(services, 'inconnue' as ExpenseId, input);
    expect(result).toEqual({ ok: false, error: 'notFound' });
  });

  it('ne ressuscite pas une dépense supprimée', async () => {
    const { services, id } = await setup();
    await deleteExpense(services.expenses, id);
    expect(await updateExpense(services, id, input)).toEqual({ ok: false, error: 'notFound' });
  });
});

describe('deleteExpense / restoreExpense', () => {
  it('supprime logiquement puis restaure', async () => {
    const { services, id } = await setup();
    await deleteExpense(services.expenses, id, new Date('2026-09-20T10:00:00Z'));
    expect(await services.expenses.findByMonth('2026-09' as never)).toEqual([]);

    await restoreExpense(services.expenses, id, new Date('2026-09-20T10:00:05Z'));
    const [restored] = await services.expenses.findByMonth('2026-09' as never);
    expect(restored).toMatchObject({ id, deletedAt: null, amount: 1850 });
  });
});
