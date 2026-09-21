import { buildDefaultCatalog } from '@/domains/categorization';
import type { CategoryId, SubcategoryId, Tag, TagId } from '@/domains/categorization';
import type { Expense, ExpenseId } from '@/domains/expenses';
import type { IsoInstant, LocalDate } from '@/shared/lib/time';
import type { Focus, FocusId } from '@/domains/focus';
import { emptyBackupData } from './backupFile';
import type { BackupData } from './backupFile';
import { hasChanges, mergeBackup } from './mergeBackup';

const at = (value: string) => `2026-09-${value}:00.000Z` as IsoInstant; // at('20T10:00') → 2026-09-20T10:00:00.000Z

function spend(id: string, overrides: Partial<Expense> = {}): Expense {
  return {
    id: id as ExpenseId,
    amount: 1000 as Expense['amount'],
    categoryId: 'groceries' as CategoryId,
    subcategoryId: null,
    tagIds: [],
    date: '2026-09-20' as LocalDate,
    createdAt: at('20T10:00'),
    updatedAt: at('20T10:00'),
    deletedAt: null,
    ...overrides,
  };
}

const catalog = () => buildDefaultCatalog();
const device = (expenses: Expense[] = [], extra: Partial<BackupData> = {}): BackupData => ({
  ...emptyBackupData(),
  ...catalog(),
  expenses,
  ...extra,
});
const tag = (id: string, name: string, updatedAt = at('20T10:00')): Tag => ({
  id: id as TagId,
  name,
  updatedAt,
  deletedAt: null,
});
const ids = (list: { id: string }[]) => list.map((item) => item.id).sort();

describe('mergeBackup : dépenses', () => {
  it('ajoute les dépenses que cet appareil ne connaît pas', () => {
    const plan = mergeBackup(device([spend('a')]), device([spend('a'), spend('b'), spend('c')]));
    expect(ids(plan.toWrite.expenses)).toEqual(['b', 'c']);
    expect(plan.summary.expenses).toMatchObject({ added: 2, updated: 0, deleted: 0, unchanged: 1 });
  });

  it('remplace une dépense par sa version plus récente', () => {
    const local = device([spend('a', { amount: 1000 as Expense['amount'] })]);
    const incoming = device([
      spend('a', { amount: 2000 as Expense['amount'], updatedAt: at('21T09:00') }),
    ]);
    const plan = mergeBackup(local, incoming);
    expect(plan.toWrite.expenses).toHaveLength(1);
    expect(plan.toWrite.expenses[0]?.amount).toBe(2000);
    expect(plan.summary.expenses).toMatchObject({ added: 0, updated: 1 });
  });

  it('garde la version locale quand elle est plus récente', () => {
    const local = device([
      spend('a', { amount: 3000 as Expense['amount'], updatedAt: at('22T09:00') }),
    ]);
    const incoming = device([
      spend('a', { amount: 2000 as Expense['amount'], updatedAt: at('21T09:00') }),
    ]);
    const plan = mergeBackup(local, incoming);
    expect(plan.toWrite.expenses).toEqual([]);
    expect(plan.summary.expenses.unchanged).toBe(1);
  });

  it('ne fait rien à égalité : importer deux fois le même fichier ne change rien', () => {
    const data = device([spend('a'), spend('b')]);
    const plan = mergeBackup(data, data);
    expect(plan.toWrite.expenses).toEqual([]);
    expect(hasChanges(plan.summary)).toBe(false);
  });

  it('est idempotent : après application, une seconde fusion n’a plus rien à faire', () => {
    const local = device([spend('a')]);
    const incoming = device([
      spend('a', { amount: 2000 as Expense['amount'], updatedAt: at('21T09:00') }),
      spend('b'),
    ]);
    const first = mergeBackup(local, incoming);
    const applied = device([...first.toWrite.expenses]); // simplification : tout ce qui change est écrit
    expect(hasChanges(mergeBackup(applied, incoming).summary)).toBe(false);
  });

  describe('suppressions', () => {
    it('propage une suppression faite sur l’autre appareil', () => {
      const local = device([spend('a')]);
      const incoming = device([
        spend('a', { deletedAt: at('21T09:00'), updatedAt: at('21T09:00') }),
      ]);
      const plan = mergeBackup(local, incoming);
      expect(plan.toWrite.expenses[0]?.deletedAt).toBe(at('21T09:00'));
      expect(plan.summary.expenses.deleted).toBe(1);
    });

    it('ne ressuscite pas une dépense supprimée ici quand l’autre version est plus ancienne', () => {
      const local = device([spend('a', { deletedAt: at('22T09:00'), updatedAt: at('22T09:00') })]);
      const incoming = device([spend('a')]);
      const plan = mergeBackup(local, incoming);
      expect(plan.toWrite.expenses).toEqual([]);
    });

    it('une modification plus récente l’emporte sur une suppression plus ancienne', () => {
      const local = device([spend('a', { deletedAt: at('21T09:00'), updatedAt: at('21T09:00') })]);
      const incoming = device([
        spend('a', { amount: 5000 as Expense['amount'], updatedAt: at('22T09:00') }),
      ]);
      const plan = mergeBackup(local, incoming);
      expect(plan.toWrite.expenses[0]).toMatchObject({ deletedAt: null, amount: 5000 });
      expect(plan.summary.expenses.updated).toBe(1);
    });

    it('conserve une suppression jamais vue ici sans la compter comme un ajout', () => {
      const incoming = device([
        spend('gone', { deletedAt: at('21T09:00'), updatedAt: at('21T09:00') }),
      ]);
      const plan = mergeBackup(device(), incoming);
      expect(plan.toWrite.expenses).toHaveLength(1);
      expect(plan.summary.expenses.added).toBe(0);
    });
  });

  describe('références', () => {
    it('ignore une dépense qui pointe vers une catégorie inconnue', () => {
      const orphan = spend('x', { categoryId: 'inexistante' as CategoryId });
      const plan = mergeBackup(device(), device([orphan, spend('ok')]));
      expect(ids(plan.toWrite.expenses)).toEqual(['ok']);
      expect(plan.summary.expenses).toMatchObject({ added: 1, skipped: 1 });
    });

    it('ignore une dépense dont la sous-catégorie est inconnue', () => {
      const orphan = spend('x', { subcategoryId: 'groceries.nope' as SubcategoryId });
      const plan = mergeBackup(device(), device([orphan]));
      expect(plan.summary.expenses.skipped).toBe(1);
    });

    it('retire les tags inconnus plutôt que de garder une référence cassée', () => {
      const withGhost = spend('a', { tagIds: ['cash' as TagId, 'fantome' as TagId] });
      const plan = mergeBackup(device(), device([withGhost]));
      expect(plan.toWrite.expenses[0]?.tagIds).toEqual(['cash']);
    });
  });
});

describe('mergeBackup : tags', () => {
  it('fusionne deux tags de même nom créés séparément, et répare les dépenses', () => {
    const local = device([], { tags: [...catalog().tags, tag('LOCAL1', 'sortie-plage')] });
    const incoming = device([spend('a', { tagIds: ['REMOTE1' as TagId] })], {
      tags: [...catalog().tags, tag('REMOTE1', 'sortie-plage')],
    });
    const plan = mergeBackup(local, incoming);
    // Le tag entrant n'est pas dupliqué : la dépense pointe vers le tag local.
    expect(plan.toWrite.tags).toEqual([]);
    expect(plan.toWrite.expenses[0]?.tagIds).toEqual(['LOCAL1']);
  });

  it('ajoute un tag nouveau', () => {
    const incoming = device([], { tags: [...catalog().tags, tag('NEW1', 'voyage-porto')] });
    const plan = mergeBackup(device(), incoming);
    expect(plan.toWrite.tags.map((t) => t.name)).toEqual(['voyage-porto']);
    expect(plan.summary.catalog.added).toBe(1);
  });

  it('un tag fusionné n’apparaît qu’une fois même si la dépense le citait deux fois', () => {
    const local = device([], { tags: [...catalog().tags, tag('LOCAL1', 'x')] });
    const incoming = device([spend('a', { tagIds: ['REMOTE1' as TagId, 'LOCAL1' as TagId] })], {
      tags: [...catalog().tags, tag('REMOTE1', 'x'), tag('LOCAL1', 'x')],
    });
    const plan = mergeBackup(local, incoming);
    expect(plan.toWrite.expenses[0]?.tagIds).toEqual(['LOCAL1']);
  });
});

describe('mergeBackup : catalogue', () => {
  it('propage le renommage d’une catégorie (version plus récente)', () => {
    const renamed = catalog().categories.map((c) =>
      c.id === 'groceries' ? { ...c, name: 'Bouffe', updatedAt: at('21T09:00') } : c,
    );
    const plan = mergeBackup(device(), device([], { categories: renamed }));
    expect(plan.toWrite.categories).toHaveLength(1);
    expect(plan.toWrite.categories[0]).toMatchObject({ id: 'groceries', name: 'Bouffe' });
    expect(plan.summary.catalog.updated).toBe(1);
  });

  it('les catalogues par défaut identiques ne produisent aucun changement', () => {
    const plan = mergeBackup(device(), device());
    expect(plan.toWrite.categories).toEqual([]);
    expect(plan.toWrite.subcategories).toEqual([]);
    expect(plan.toWrite.tags).toEqual([]);
  });

  it('une modification locale plus récente n’est pas écrasée par le catalogue par défaut de l’autre', () => {
    const local = device([], {
      categories: catalog().categories.map((c) =>
        c.id === 'groceries' ? { ...c, name: 'Ma bouffe', updatedAt: at('22T09:00') } : c,
      ),
    });
    const plan = mergeBackup(local, device());
    expect(plan.toWrite.categories).toEqual([]);
  });
});

const pin = (id: string, targetId: string, overrides: Partial<Focus> = {}): Focus => ({
  id: id as FocusId,
  kind: 'category',
  targetId,
  position: 0,
  updatedAt: at('20T10:00'),
  deletedAt: null,
  ...overrides,
});

describe('mergeBackup : focus', () => {
  it('ajoute un focus épinglé sur l’autre appareil', () => {
    const plan = mergeBackup(device(), device([], { focuses: [pin('f1', 'transport')] }));
    expect(plan.toWrite.focuses.map((f) => f.targetId)).toEqual(['transport']);
    expect(plan.summary.catalog.added).toBe(1);
  });

  it('ne double pas un focus épinglé des deux côtés sur la même cible', () => {
    const local = device([], { focuses: [pin('LOCAL', 'transport')] });
    const incoming = device([], { focuses: [pin('REMOTE', 'transport')] });
    expect(mergeBackup(local, incoming).toWrite.focuses).toEqual([]);
  });

  it('garde deux focus de cibles différentes', () => {
    const local = device([], { focuses: [pin('a', 'transport')] });
    const incoming = device([], { focuses: [pin('b', 'health')] });
    expect(mergeBackup(local, incoming).toWrite.focuses.map((f) => f.id)).toEqual(['b']);
  });

  it('propage un focus retiré (suppression logique plus récente)', () => {
    const local = device([], { focuses: [pin('a', 'transport')] });
    const incoming = device([], {
      focuses: [pin('a', 'transport', { deletedAt: at('21T09:00'), updatedAt: at('21T09:00') })],
    });
    const plan = mergeBackup(local, incoming);
    expect(plan.toWrite.focuses[0]?.deletedAt).toBe(at('21T09:00'));
    expect(plan.summary.catalog.updated).toBe(1);
  });

  it('propage un changement d’ordre plus récent', () => {
    const local = device([], { focuses: [pin('a', 'transport', { position: 0 })] });
    const incoming = device([], {
      focuses: [pin('a', 'transport', { position: 2, updatedAt: at('21T09:00') })],
    });
    expect(mergeBackup(local, incoming).toWrite.focuses[0]?.position).toBe(2);
  });

  it('accepte un ancien fichier sans focus', () => {
    const legacy = { ...device(), focuses: [] };
    expect(
      mergeBackup(device([], { focuses: [pin('a', 'transport')] }), legacy).toWrite.focuses,
    ).toEqual([]);
  });
});
