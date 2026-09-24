import { buildDefaultCatalog } from '@/domains/categorization';
import type { Expense } from '@/domains/expenses';
import type { IsoInstant } from '@/shared/lib/time';
import {
  BACKUP_VERSION,
  backupFileName,
  createBackupFile,
  emptyBackupData,
  serializeBackup,
} from './backupFile';
import type { BackupData } from './backupFile';
import { parseBackup } from './parseBackup';

const expense = {
  id: 'e1',
  amount: 1240,
  categoryId: 'groceries',
  subcategoryId: 'groceries.meat',
  tagIds: ['avec-amis'],
  date: '2026-09-20',
  createdAt: '2026-09-20T10:00:00.000Z',
  updatedAt: '2026-09-20T10:00:00.000Z',
  deletedAt: null,
} as unknown as Expense;

const sample = (): BackupData => ({
  ...emptyBackupData(),
  ...buildDefaultCatalog(),
  expenses: [expense],
});
const text = (file: unknown) => JSON.stringify(file);
const valid = () => createBackupFile(sample(), new Date('2026-09-21T09:00:00Z'));

describe('parseBackup', () => {
  it('relit exactement ce qui a été exporté', () => {
    const result = parseBackup(serializeBackup(valid()));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.file.data.expenses).toEqual([expense]);
      expect(result.file.data.categories).toHaveLength(9);
      expect(result.file.exportedAt).toBe('2026-09-21T09:00:00.000Z');
    }
  });

  it('accepte une dépense supprimée logiquement (elle doit voyager)', () => {
    const deleted = { ...expense, deletedAt: '2026-09-21T08:00:00.000Z' as IsoInstant };
    const file = createBackupFile({ ...sample(), expenses: [deleted] });
    expect(parseBackup(serializeBackup(file)).ok).toBe(true);
  });

  it('refuse ce qui n’est pas du JSON', () => {
    expect(parseBackup('pas du json')).toEqual({ ok: false, error: 'notJson' });
    expect(parseBackup('')).toEqual({ ok: false, error: 'notJson' });
  });

  it('refuse un JSON qui n’est pas une sauvegarde de cette application', () => {
    expect(parseBackup('[]')).toEqual({ ok: false, error: 'notABackup' });
    expect(parseBackup('null')).toEqual({ ok: false, error: 'notABackup' });
    expect(parseBackup(text({ format: 'autre', version: 1 }))).toEqual({
      ok: false,
      error: 'notABackup',
    });
  });

  it('refuse un fichier créé par une version plus récente', () => {
    const file = { ...valid(), version: BACKUP_VERSION + 1 };
    expect(parseBackup(text(file))).toEqual({ ok: false, error: 'newerVersion' });
  });

  describe('refuse un contenu invalide', () => {
    const withExpense = (overrides: object) => {
      const file = valid();
      return text({ ...file, data: { ...file.data, expenses: [{ ...expense, ...overrides }] } });
    };

    it.each([
      ['un montant nul', { amount: 0 }],
      ['un montant décimal', { amount: 12.5 }],
      ['un montant négatif', { amount: -5 }],
      ['une date inexistante', { date: '2026-02-30' }],
      ['une date mal formée', { date: '20/09/2026' }],
      ['un horodatage invalide', { updatedAt: 'hier' }],
      ['un identifiant vide', { id: '' }],
      ['des tags qui ne sont pas une liste', { tagIds: 'cash' }],
    ])('%s', (_label, overrides) => {
      expect(parseBackup(withExpense(overrides))).toEqual({ ok: false, error: 'invalid' });
    });

    it('une couleur de catégorie inconnue', () => {
      const file = valid();
      const [first, ...rest] = file.data.categories;
      const broken = {
        ...file,
        data: { ...file.data, categories: [{ ...first, color: 'rose' }, ...rest] },
      };
      expect(parseBackup(text(broken))).toEqual({ ok: false, error: 'invalid' });
    });

    it('une section manquante', () => {
      const file = valid();
      const withoutTags = Object.fromEntries(
        Object.entries(file.data).filter(([section]) => section !== 'tags'),
      );
      expect(parseBackup(text({ ...file, data: withoutTags }))).toEqual({
        ok: false,
        error: 'invalid',
      });
    });
  });

  it('ignore les champs inconnus au lieu de refuser le fichier', () => {
    const file = valid();
    const extended = {
      ...file,
      futureField: 1,
      data: { ...file.data, expenses: [{ ...expense, champInconnu: 'x' }] },
    };
    const result = parseBackup(text(extended));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.file.data.expenses[0]).not.toHaveProperty('champInconnu');
  });
});

describe('focus dans le fichier', () => {
  it('relit un fichier créé avant les focus (sans section « focuses ») comme « aucun focus »', () => {
    const file = valid();
    const oldData = Object.fromEntries(
      Object.entries(file.data).filter(([section]) => section !== 'focuses'),
    );
    const result = parseBackup(text({ ...file, data: oldData }));
    expect(result.ok && result.file.data.focuses).toEqual([]);
  });

  it('exporte et relit les focus, supprimés compris', () => {
    const focuses = [
      {
        id: 'f1',
        kind: 'subcategory',
        targetId: 'groceries.meat',
        position: 0,
        updatedAt: '2026-09-20T10:00:00.000Z',
        deletedAt: null,
      },
      {
        id: 'f2',
        kind: 'tag',
        targetId: 'cash',
        position: 1,
        updatedAt: '2026-09-20T10:00:00.000Z',
        deletedAt: '2026-09-21T10:00:00.000Z',
      },
    ] as unknown as BackupData['focuses'];
    const result = parseBackup(serializeBackup(createBackupFile({ ...sample(), focuses })));
    expect(result.ok && result.file.data.focuses).toEqual(focuses);
  });

  it('refuse un focus d’un genre inconnu', () => {
    const file = valid();
    const broken = {
      ...file,
      data: {
        ...file.data,
        focuses: [
          {
            id: 'f',
            kind: 'meteo',
            targetId: 'x',
            position: 0,
            updatedAt: '2026-09-20T10:00:00.000Z',
            deletedAt: null,
          },
        ],
      },
    };
    expect(parseBackup(text(broken))).toEqual({ ok: false, error: 'invalid' });
  });
});

describe('budget dans le fichier', () => {
  it('exporte et relit le budget', () => {
    const budget = {
      housingCents: 100000,
      flexCents: 40000,
      totalCents: 140000,
      updatedAt: '2026-09-20T10:00:00.000Z',
    };
    const result = parseBackup(serializeBackup(createBackupFile({ ...sample(), budget } as never)));
    expect(result.ok && result.file.data.budget).toEqual(budget);
  });

  it('un ancien fichier sans budget se relit comme « jamais réglé »', () => {
    const file = valid();
    const oldData = Object.fromEntries(
      Object.entries(file.data).filter(([section]) => section !== 'budget'),
    );
    const result = parseBackup(text({ ...file, data: oldData }));
    expect(result.ok && result.file.data.budget).toBeNull();
  });

  it('refuse un budget avec un montant négatif', () => {
    const file = valid();
    const budget = {
      housingCents: -1,
      flexCents: 40000,
      totalCents: 140000,
      updatedAt: '2026-09-20T10:00:00.000Z',
    };
    expect(parseBackup(text({ ...file, data: { ...file.data, budget } }))).toEqual({
      ok: false,
      error: 'invalid',
    });
  });
});

describe('import bancaire dans le fichier', () => {
  it('exporte et relit le commerçant et la référence d’origine d’une dépense importée', () => {
    const imported = {
      ...expense,
      note: 'Continente',
      externalRef: 'revolut:2026-09-05 12:00:00|Continente|-2000|0',
    };
    const result = parseBackup(
      serializeBackup(createBackupFile({ ...sample(), expenses: [imported] })),
    );
    expect(result.ok && result.file.data.expenses[0]).toMatchObject({
      note: 'Continente',
      externalRef: 'revolut:2026-09-05 12:00:00|Continente|-2000|0',
    });
  });

  it('exporte et relit les règles apprises, et un ancien fichier sans règles se relit comme « aucune »', () => {
    const rules = [
      {
        id: 'nobby',
        categoryId: 'shopping',
        subcategoryId: null,
        ignore: false,
        updatedAt: '2026-09-20T10:00:00.000Z',
        deletedAt: null,
      },
    ];
    const withRules = parseBackup(
      serializeBackup(createBackupFile({ ...sample(), merchantRules: rules as never })),
    );
    expect(withRules.ok && withRules.file.data.merchantRules).toEqual(rules);

    const file = valid();
    const oldData = Object.fromEntries(
      Object.entries(file.data).filter(([section]) => section !== 'merchantRules'),
    );
    const legacy = parseBackup(text({ ...file, data: oldData }));
    expect(legacy.ok && legacy.file.data.merchantRules).toEqual([]);
  });
});

describe('backupFileName', () => {
  it('contient la date du jour', () => {
    expect(backupFileName(new Date('2026-09-21T09:00:00Z'))).toBe('lisboa-2026-09-21.json');
  });
});
