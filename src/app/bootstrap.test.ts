import { sumCents } from '@/domains/expenses';
import { createTestServices } from '@/test/services';
import { databaseNameFor } from './bootstrap';

describe('bootstrap', () => {
  it('installe les catégories par défaut, sans aucune dépense', async () => {
    const services = await createTestServices();
    expect(services.isDemo).toBe(false);
    expect((await services.catalog.load()).categories).toHaveLength(9);
    expect(await services.expenses.isEmpty()).toBe(true);
  });

  it('en démo, remplit la base avec les dépenses des maquettes', async () => {
    const services = await createTestServices({
      search: '?demo=1',
      now: new Date('2026-09-20T12:00:00Z'),
    });
    expect(services.isDemo).toBe(true);
    const september = await services.expenses.findByMonth('2026-09' as never);
    expect(sumCents(september.map((e) => e.amount))).toBe(97000);
  });

  it('ne duplique pas les données de démo à un second lancement', async () => {
    const services = await createTestServices({ search: '?demo=1' });
    const before = await services.db.expenses.count();
    const { seedDemoExpenses } = await import('@/domains/expenses');
    await seedDemoExpenses(services.expenses);
    expect(await services.db.expenses.count()).toBe(before);
  });

  it('utilise une base différente en démo et en usage réel', () => {
    expect(databaseNameFor(true)).not.toBe(databaseNameFor(false));
  });
});
