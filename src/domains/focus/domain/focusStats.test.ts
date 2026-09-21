import type { CategoryId, SubcategoryId, TagId } from '@/domains/categorization';
import type { Expense, ExpenseId } from '@/domains/expenses';
import type { IsoInstant, LocalDate, YearMonth } from '@/shared/lib/time';
import type { FocusTarget } from './focus';
import { focusComposition, focusStats } from './focusStats';

const month = '2026-09' as YearMonth;
const meat: FocusTarget = { kind: 'subcategory', targetId: 'groceries.meat' };

let seq = 0;
function spend(date: string, amount: number, overrides: Partial<Expense> = {}): Expense {
  seq += 1;
  return {
    id: `e${seq}` as ExpenseId,
    amount: amount as Expense['amount'],
    categoryId: 'groceries' as CategoryId,
    subcategoryId: 'groceries.meat' as SubcategoryId,
    tagIds: [],
    date: date as LocalDate,
    createdAt: `2026-09-01T10:00:${String(seq % 60).padStart(2, '0')}.000Z` as IsoInstant,
    updatedAt: '2026-09-01T10:00:00.000Z' as IsoInstant,
    deletedAt: null,
    ...overrides,
  };
}

// 7 achats de viande pour 58,00 € au 20 septembre, sur un mois de 970,00 € : comme la maquette
// (≈ 20 € par semaine, 8,29 € de panier moyen, 6 % du mois, 18 / 24 / 16 € par semaine).
const meatPurchases = [
  spend('2026-09-02', 900),
  spend('2026-09-05', 900), // 1–7   : 18,00 €
  spend('2026-09-09', 1200),
  spend('2026-09-13', 1200), // 8–14  : 24,00 €
  spend('2026-09-16', 400),
  spend('2026-09-18', 400),
  spend('2026-09-20', 800), // 15–21 : 16,00 €
];
const others = [
  spend('2026-09-01', 42000, {
    categoryId: 'housing' as CategoryId,
    subcategoryId: 'housing.rent' as SubcategoryId,
  }),
  spend('2026-09-10', 50200, { categoryId: 'activities' as CategoryId, subcategoryId: null }),
];
const september = [...meatPurchases, ...others];
const stats = focusStats({
  target: meat,
  expenses: september,
  month,
  today: '2026-09-20' as LocalDate,
});

describe('focusStats (cas de la maquette : viande au 20 septembre)', () => {
  it('total, achats, panier moyen', () => {
    expect(stats.total).toBe(5800);
    expect(stats.count).toBe(7);
    expect(stats.averageBasket).toBe(829); // 8,29 €
  });

  it('part du mois : 58 € sur 970 € font 6 %', () => {
    expect(Math.round(stats.shareOfMonth * 100)).toBe(6);
  });

  it('rythme hebdomadaire : ≈ 20 € par semaine', () => {
    expect(stats.weeklyRate).toBe(2030); // 58 € ÷ 20 jours × 7
  });

  it('semaine par semaine : 18 €, 24 €, puis 16 € en cours', () => {
    expect(stats.weeks.map((w) => [w.startDay, w.endDay, w.amount, w.isCurrent])).toEqual([
      [1, 7, 1800, false],
      [8, 14, 2400, false],
      [15, 21, 1600, true],
    ]);
  });

  it('entrées : la plus récente d’abord, seulement celles du focus', () => {
    expect(stats.entries).toHaveLength(7);
    expect(stats.entries[0]?.date).toBe('2026-09-20');
    expect(stats.entries.every((e) => e.subcategoryId === 'groceries.meat')).toBe(true);
  });
});

describe('focusStats : autres cas', () => {
  const run = (today: string, target = meat, expenses = september) =>
    focusStats({ target, expenses, month, today: today as LocalDate });

  it('un focus sans dépense reste à zéro, sans diviser par zéro', () => {
    const empty = run('2026-09-20', { kind: 'subcategory', targetId: 'groceries.fish' });
    expect(empty).toMatchObject({
      total: 0,
      count: 0,
      averageBasket: null,
      shareOfMonth: 0,
      weeklyRate: 0,
    });
    expect(empty.weeks.every((w) => w.amount === 0)).toBe(true);
  });

  it('un mois passé montre toutes ses semaines, aucune en cours', () => {
    const past = run('2026-10-15');
    expect(past.weeks.map((w) => [w.startDay, w.endDay])).toEqual([
      [1, 7],
      [8, 14],
      [15, 21],
      [22, 28],
      [29, 30],
    ]);
    expect(past.weeks.some((w) => w.isCurrent)).toBe(false);
    expect(past.weeklyRate).toBe(Math.round((5800 / 30) * 7)); // rythme sur les 30 jours
  });

  it('un mois futur est vide', () => {
    // Un mois qui n'a pas commencé ne contient aucune dépense.
    expect(run('2026-08-15', meat, [])).toMatchObject({ total: 0, weeks: [], weeklyRate: 0 });
  });

  it('une dépense de dernière semaine incomplète (29–30) est comptée', () => {
    const late = [...september, spend('2026-09-30', 700)];
    const past = run('2026-10-15', meat, late);
    expect(past.weeks.at(-1)).toMatchObject({ startDay: 29, endDay: 30, amount: 700 });
  });

  it('suit une catégorie entière', () => {
    const groceries = run('2026-09-20', { kind: 'category', targetId: 'groceries' });
    expect(groceries.total).toBe(5800);
  });

  it('suit un tag, à travers les catégories', () => {
    const tagged = [
      spend('2026-09-19', 1850, {
        categoryId: 'activities' as CategoryId,
        subcategoryId: null,
        tagIds: ['avec-amis' as TagId],
      }),
      spend('2026-09-11', 1580, { tagIds: ['avec-amis' as TagId] }),
      spend('2026-09-12', 999),
    ];
    const result = run('2026-09-20', { kind: 'tag', targetId: 'avec-amis' }, tagged);
    expect(result.count).toBe(2);
    expect(result.total).toBe(3430);
  });
});

describe('focusComposition', () => {
  const parentCategoryOf = (id: SubcategoryId) =>
    id.startsWith('groceries.') ? ('groceries' as CategoryId) : undefined;
  const groceries = [
    ...meatPurchases,
    spend('2026-09-03', 11000, { subcategoryId: 'groceries.staples' as SubcategoryId }),
  ];

  it('une sous-catégorie face au reste de sa catégorie : « Viande 58 € · le reste 110 € »', () => {
    expect(focusComposition({ target: meat, expenses: groceries, parentCategoryOf })).toEqual({
      kind: 'share-of-parent',
      parentCategoryId: 'groceries',
      focusAmount: 5800,
      restAmount: 11000,
    });
  });

  it('une catégorie se répartit par sous-catégorie, les plus gros postes d’abord', () => {
    const result = focusComposition({
      target: { kind: 'category', targetId: 'groceries' },
      expenses: groceries,
      parentCategoryOf,
    });
    expect(result).toMatchObject({ kind: 'by-subcategory', others: 0 });
    expect(result?.kind === 'by-subcategory' && result.parts.map((p) => [p.id, p.amount])).toEqual([
      ['groceries.staples', 11000],
      ['groceries.meat', 5800],
    ]);
  });

  it('regroupe au-delà de 4 postes, sans oublier les dépenses sans sous-catégorie', () => {
    const many = ['a', 'b', 'c', 'd', 'e', 'f'].map((k, i) =>
      spend('2026-09-05', 1000 - i * 100, { subcategoryId: `groceries.${k}` as SubcategoryId }),
    );
    many.push(spend('2026-09-06', 50, { subcategoryId: null }));
    const result = focusComposition({
      target: { kind: 'category', targetId: 'groceries' },
      expenses: many,
      parentCategoryOf,
    });
    if (result?.kind !== 'by-subcategory') throw new Error('répartition attendue');
    expect(result.parts).toHaveLength(4);
    expect(result.others).toBe(600 + 500 + 50); // e, f et « sans sous-catégorie »
  });

  it('un tag se répartit par catégorie', () => {
    const tagged = [
      spend('2026-09-19', 1850, {
        categoryId: 'activities' as CategoryId,
        subcategoryId: null,
        tagIds: ['avec-amis' as TagId],
      }),
      spend('2026-09-11', 1580, {
        categoryId: 'activities' as CategoryId,
        subcategoryId: null,
        tagIds: ['avec-amis' as TagId],
      }),
      spend('2026-09-12', 900, { tagIds: ['avec-amis' as TagId] }),
    ];
    const result = focusComposition({
      target: { kind: 'tag', targetId: 'avec-amis' },
      expenses: tagged,
      parentCategoryOf,
    });
    expect(result?.kind === 'by-category' && result.parts.map((p) => [p.id, p.amount])).toEqual([
      ['activities', 3430],
      ['groceries', 900],
    ]);
  });

  it('ne plante pas quand la sous-catégorie est introuvable', () => {
    const result = focusComposition({
      target: { kind: 'subcategory', targetId: 'x.y' },
      expenses: [],
      parentCategoryOf,
    });
    expect(result).toBeNull();
  });
});
