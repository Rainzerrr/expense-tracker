import type { CategoryId } from '@/domains/categorization';
import type { Cents } from '@/domains/expenses';
import type { IsoInstant } from '@/shared/lib/time';
import type { Budget } from './budget';
import { computeBudgetStatus } from './budgetStatus';

const line = (categoryId: string, amount: number) => ({
  categoryId: categoryId as CategoryId,
  amount,
});

// Les montants du budget cible de l'utilisateur : 1 000 € logement, 400 € courses + activités, 1 400 € au total.
const budget: Budget = {
  housingCents: 100000 as Cents,
  flexCents: 40000 as Cents,
  totalCents: 140000 as Cents,
  updatedAt: '2026-09-01T00:00:00.000Z' as IsoInstant,
};

describe('computeBudgetStatus', () => {
  it('cumule le logement, courses + activités ensemble, et le total toutes catégories', () => {
    const expenses = [
      line('housing', 100000),
      line('groceries', 15000),
      line('activities', 10000),
      line('transport', 6000),
    ];
    const status = computeBudgetStatus({
      expenses,
      fixedCategoryIds: ['housing'] as CategoryId[],
      budget,
    });
    expect(status.housing).toMatchObject({
      spent: 100000,
      target: 100000,
      remaining: 0,
      percent: 1,
      isOver: false,
    });
    expect(status.flex).toMatchObject({
      spent: 25000,
      target: 40000,
      remaining: 15000,
      isOver: false,
    });
    expect(status.total).toMatchObject({
      spent: 131000,
      target: 140000,
      remaining: 9000,
      isOver: false,
    });
  });

  it('signale un dépassement, avec un montant négatif restant', () => {
    const expenses = [line('groceries', 25000), line('activities', 20000)];
    const status = computeBudgetStatus({
      expenses,
      fixedCategoryIds: ['housing'] as CategoryId[],
      budget,
    });
    expect(status.flex).toMatchObject({ spent: 45000, remaining: -5000, isOver: true });
    expect(Math.round(status.flex.percent * 100)).toBe(113);
  });

  it('un mois sans dépense reste à zéro, sans dépassement', () => {
    const status = computeBudgetStatus({
      expenses: [],
      fixedCategoryIds: ['housing'] as CategoryId[],
      budget,
    });
    expect(status.housing).toMatchObject({ spent: 0, percent: 0, isOver: false });
    expect(status.total).toMatchObject({ spent: 0, percent: 0, isOver: false });
  });

  it('les catégories hors budget (transport, voyages…) comptent dans le total, pas dans « courses + activités »', () => {
    const expenses = [line('travel', 50000)];
    const status = computeBudgetStatus({
      expenses,
      fixedCategoryIds: ['housing'] as CategoryId[],
      budget,
    });
    expect(status.flex.spent).toBe(0);
    expect(status.total.spent).toBe(50000);
  });
});
