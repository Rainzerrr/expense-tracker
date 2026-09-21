import type { CategoryId } from '@/domains/categorization';
import { categoryBreakdown } from './categoryBreakdown';

const line = (categoryId: string, amount: number) => ({
  categoryId: categoryId as CategoryId,
  amount,
});

describe('categoryBreakdown', () => {
  // Maquette : Logement 420, Courses 168, Activités 142, Voyages 85, Transport 61, Autres 94 = 970 €.
  const september = [
    line('housing', 42000),
    line('groceries', 16800),
    line('activities', 14200),
    line('travel', 8500),
    line('transport', 6100),
    line('subscriptions', 3000),
    line('health', 2400),
    line('shopping', 4000),
  ];

  it('garde les 5 plus grosses catégories et regroupe le reste dans « Autres »', () => {
    const { slices, total } = categoryBreakdown(september);
    expect(total).toBe(97000);
    expect(slices.map((s) => [s.categoryId, s.amount])).toEqual([
      ['housing', 42000],
      ['groceries', 16800],
      ['activities', 14200],
      ['travel', 8500],
      ['transport', 6100],
      [null, 9400],
    ]);
  });

  it('les parts font 100 %', () => {
    const { slices } = categoryBreakdown(september);
    expect(slices.reduce((sum, s) => sum + s.share, 0)).toBeCloseTo(1);
    expect(slices[0]?.share).toBeCloseTo(420 / 970);
  });

  it('additionne plusieurs dépenses d’une même catégorie', () => {
    const { slices } = categoryBreakdown([line('groceries', 100), line('groceries', 250)]);
    expect(slices).toEqual([{ categoryId: 'groceries', amount: 350, share: 1 }]);
  });

  it('n’invente pas un « Autres » pour une seule catégorie restante', () => {
    const six = ['a', 'b', 'c', 'd', 'e', 'f'].map((id, i) => line(id, 1000 - i * 100));
    const { slices } = categoryBreakdown(six);
    expect(slices).toHaveLength(6);
    expect(slices.some((s) => s.categoryId === null)).toBe(false);
  });

  it('un mois sans dépense donne une répartition vide', () => {
    expect(categoryBreakdown([])).toEqual({ total: 0, slices: [] });
  });

  it('départage les montants égaux de façon stable', () => {
    const { slices } = categoryBreakdown([line('b', 500), line('a', 500)]);
    expect(slices.map((s) => s.categoryId)).toEqual(['a', 'b']);
  });
});
