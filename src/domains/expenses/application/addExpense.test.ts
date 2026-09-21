import { ensureDefaultCatalog } from '@/domains/categorization';
import type { CategoryId, SubcategoryId } from '@/domains/categorization';
import { createTestServices } from '@/test/services';
import { addExpense } from './addExpense';

const validInput = {
  amount: 1240,
  categoryId: 'groceries' as CategoryId,
  subcategoryId: 'groceries.meat' as SubcategoryId,
  tagIds: [],
  date: '2026-09-20',
};

async function setup() {
  const services = await createTestServices();
  await ensureDefaultCatalog(services.catalog);
  return services;
}

describe('addExpense', () => {
  it('enregistre une dépense valide, retrouvable dans son mois', async () => {
    const services = await setup();
    const result = await addExpense(services, validInput, new Date('2026-09-20T10:00:00Z'));
    expect(result.ok).toBe(true);

    const [saved] = await services.expenses.findByMonth('2026-09' as never);
    expect(saved).toMatchObject({
      amount: 1240,
      categoryId: 'groceries',
      subcategoryId: 'groceries.meat',
      date: '2026-09-20',
      deletedAt: null,
      createdAt: '2026-09-20T10:00:00.000Z',
    });
  });

  it("n'écrit rien quand une règle du domaine est violée", async () => {
    const services = await setup();
    const result = await addExpense(services, { ...validInput, amount: 0 });
    expect(result).toEqual({ ok: false, error: 'invalidAmount' });
    expect(await services.expenses.isEmpty()).toBe(true);
  });

  it('refuse une sous-catégorie d’une autre catégorie', async () => {
    const services = await setup();
    const result = await addExpense(services, {
      ...validInput,
      categoryId: 'transport' as CategoryId,
    });
    expect(result).toEqual({ ok: false, error: 'subcategoryMismatch' });
    expect(await services.expenses.isEmpty()).toBe(true);
  });
});
