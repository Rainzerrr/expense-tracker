import type { AppDatabase } from '@/shared/infrastructure/database';
import { monthEnd, monthStart } from '@/shared/lib/time';
import type { IsoInstant, LocalDate, YearMonth } from '@/shared/lib/time';
import type { Expense, ExpenseId } from '../domain/expense';
import type { ExpenseRepository } from '../domain/ExpenseRepository';

export class DexieExpenseRepository implements ExpenseRepository {
  constructor(private readonly db: AppDatabase) {}

  async add(expense: Expense) {
    await this.db.expenses.add(expense);
  }

  async addMany(expenses: Expense[]) {
    await this.db.expenses.bulkAdd(expenses);
  }

  async update(expense: Expense) {
    await this.db.expenses.put(expense);
  }

  async softDelete(id: ExpenseId, at: IsoInstant) {
    await this.db.expenses.update(id, { deletedAt: at, updatedAt: at });
  }

  async restore(id: ExpenseId, at: IsoInstant) {
    await this.db.expenses.update(id, { deletedAt: null, updatedAt: at });
  }

  async findById(id: ExpenseId) {
    const expense = await this.db.expenses.get(id);
    return expense && expense.deletedAt === null ? expense : undefined;
  }

  async findByMonth(month: YearMonth) {
    return this.findBetween(monthStart(month), monthEnd(month));
  }

  async findBetween(from: LocalDate, to: LocalDate) {
    const expenses = await this.db.expenses.where('date').between(from, to, true, true).toArray();
    return expenses
      .filter((expense) => expense.deletedAt === null)
      .sort(
        (a, b) =>
          b.date.localeCompare(a.date) ||
          b.createdAt.localeCompare(a.createdAt) ||
          // Même jour, même instant : l'identifiant (ULID, croissant) décide, ce qui garde l'ordre stable.
          b.id.localeCompare(a.id),
      );
  }

  async externalRefs() {
    const refs = new Set<string>();
    await this.db.expenses.each((expense) => {
      if (expense.externalRef) refs.add(expense.externalRef);
    });
    return refs;
  }

  async isEmpty() {
    return (await this.db.expenses.count()) === 0;
  }
}
