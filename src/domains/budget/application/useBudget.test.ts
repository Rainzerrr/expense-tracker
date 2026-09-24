import { DEFAULT_BUDGET } from '../domain/budget';
import { createTestServices } from '@/test/services';
import type { AppServices } from '@/app/bootstrap';

let app: AppServices;
beforeEach(async () => {
  app = await createTestServices();
});

describe('BudgetRepository (Dexie)', () => {
  it('retourne les valeurs par défaut tant que rien n’a été réglé', async () => {
    const budget = await app.budget.get();
    expect(budget).toMatchObject(DEFAULT_BUDGET);
  });

  it('retient ce qui a été réglé', async () => {
    await app.budget.set({
      housingCents: 90000 as never,
      flexCents: 30000 as never,
      totalCents: 120000 as never,
      updatedAt: '2026-09-20T10:00:00.000Z' as never,
    });
    const budget = await app.budget.get();
    expect(budget).toMatchObject({ housingCents: 90000, flexCents: 30000, totalCents: 120000 });
  });
});
