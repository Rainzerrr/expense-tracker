import type { CategoryId, TagId } from '@/domains/categorization';
import { filterExpenses } from './filterExpenses';

const spend = (id: string, categoryId: string, tags: string[] = []) => ({
  id,
  categoryId: categoryId as CategoryId,
  tagIds: tags as TagId[],
});
const expenses = [
  spend('a', 'groceries'),
  spend('b', 'activities', ['avec-amis']),
  spend('c', 'activities', ['soirée-esn']),
  spend('d', 'transport'),
];
// Champs de recherche simplifiés pour le test : l'identifiant et les tags.
const fields = (e: (typeof expenses)[number]) => [e.id, ...e.tagIds.map((t) => `#${t}`)];
const ids = (list: typeof expenses) => list.map((e) => e.id);

describe('filterExpenses', () => {
  it('sans filtre, garde tout', () => {
    expect(ids(filterExpenses(expenses, {}, fields))).toEqual(['a', 'b', 'c', 'd']);
  });

  it('filtre par catégorie', () => {
    const result = filterExpenses(expenses, { categoryId: 'activities' as CategoryId }, fields);
    expect(ids(result)).toEqual(['b', 'c']);
  });

  it('filtre par tag', () => {
    expect(ids(filterExpenses(expenses, { tagId: 'avec-amis' as TagId }, fields))).toEqual(['b']);
  });

  it('cumule les filtres et la recherche', () => {
    const filters = { categoryId: 'activities' as CategoryId, query: '#soirée' };
    expect(ids(filterExpenses(expenses, filters, fields))).toEqual(['c']);
  });

  it('traite null comme « pas de filtre »', () => {
    expect(filterExpenses(expenses, { categoryId: null, tagId: null }, fields)).toHaveLength(4);
  });
});
