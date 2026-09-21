import { AppDatabase } from '@/shared/infrastructure/database';
import type { IsoInstant, LocalDate, YearMonth } from '@/shared/lib/time';
import type { CategoryId } from '@/domains/categorization';
import type { Cents } from '../domain/money';
import type { Expense, ExpenseId } from '../domain/expense';
import { DexieExpenseRepository } from './DexieExpenseRepository';

let db: AppDatabase;
let repository: DexieExpenseRepository;

beforeEach(() => {
  db = new AppDatabase(`test-${crypto.randomUUID()}`);
  repository = new DexieExpenseRepository(db);
});
afterEach(async () => {
  await db.delete();
});

const at = (value: string) => value as IsoInstant;
function expense(id: string, date: string, overrides: Partial<Expense> = {}): Expense {
  return {
    id: id as ExpenseId,
    amount: 1000 as Cents,
    categoryId: 'groceries' as CategoryId,
    subcategoryId: null,
    tagIds: [],
    date: date as LocalDate,
    createdAt: at('2026-09-20T10:00:00.000Z'),
    updatedAt: at('2026-09-20T10:00:00.000Z'),
    deletedAt: null,
    ...overrides,
  };
}
const september = '2026-09' as YearMonth;

describe('DexieExpenseRepository', () => {
  it('retrouve les dépenses du mois, bornes incluses, les plus récentes d’abord', async () => {
    await repository.addMany([
      expense('a', '2026-08-31'),
      expense('b', '2026-09-01'),
      expense('c', '2026-09-30'),
      expense('d', '2026-09-15'),
      expense('e', '2026-10-01'),
    ]);
    const ids = (await repository.findByMonth(september)).map((e) => e.id);
    expect(ids).toEqual(['c', 'd', 'b']);
  });

  it('départage les dépenses du même jour par date de création', async () => {
    await repository.addMany([
      expense('old', '2026-09-10', { createdAt: at('2026-09-10T08:00:00.000Z') }),
      expense('new', '2026-09-10', { createdAt: at('2026-09-10T18:00:00.000Z') }),
    ]);
    expect((await repository.findByMonth(september)).map((e) => e.id)).toEqual(['new', 'old']);
  });

  it('masque une dépense supprimée logiquement, puis la retrouve après « Annuler »', async () => {
    await repository.add(expense('a', '2026-09-10'));
    await repository.softDelete('a' as ExpenseId, at('2026-09-11T09:00:00.000Z'));
    expect(await repository.findByMonth(september)).toEqual([]);
    expect(await repository.findById('a' as ExpenseId)).toBeUndefined();

    await repository.restore('a' as ExpenseId, at('2026-09-11T09:00:05.000Z'));
    const [restored] = await repository.findByMonth(september);
    expect(restored).toMatchObject({
      id: 'a',
      deletedAt: null,
      updatedAt: '2026-09-11T09:00:05.000Z',
    });
  });

  it('modifie une dépense', async () => {
    await repository.add(expense('a', '2026-09-10'));
    await repository.update(expense('a', '2026-09-12', { amount: 2500 as Cents }));
    expect(await repository.findById('a' as ExpenseId)).toMatchObject({
      date: '2026-09-12',
      amount: 2500,
    });
  });

  it('isEmpty compte aussi les dépenses supprimées', async () => {
    expect(await repository.isEmpty()).toBe(true);
    await repository.add(expense('a', '2026-09-10'));
    await repository.softDelete('a' as ExpenseId, at('2026-09-11T09:00:00.000Z'));
    expect(await repository.isEmpty()).toBe(false);
  });

  it('retrouve les dépenses entre deux dates, sur plusieurs mois', async () => {
    await repository.addMany([
      expense('a', '2026-08-31'),
      expense('b', '2026-09-15'),
      expense('c', '2026-10-01'),
      expense('d', '2026-11-30'),
      expense('deleted', '2026-10-05', { deletedAt: at('2026-10-06T00:00:00.000Z') }),
    ]);
    const found = await repository.findBetween(
      '2026-09-01' as LocalDate,
      '2026-11-30' as LocalDate,
    );
    expect(found.map((e) => e.id)).toEqual(['d', 'c', 'b']);
  });

  it('garde un ordre stable quand deux dépenses ont le même jour et le même instant', async () => {
    await repository.addMany([
      expense('01A', '2026-09-10'),
      expense('01B', '2026-09-10'),
      expense('01C', '2026-09-10'),
    ]);
    expect((await repository.findByMonth(september)).map((e) => e.id)).toEqual([
      '01C',
      '01B',
      '01A',
    ]);
  });
});
