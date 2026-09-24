import type { CategoryId, SubcategoryId } from '@/domains/categorization';
import { createTag } from '@/domains/categorization';
import type { ExpenseInput } from '@/domains/expenses';
import { addFocus, removeFocus } from '@/domains/focus';
import { DEFAULT_STAY } from '@/domains/stay';
import { importStatement, previewStatement } from '@/domains/statements';
import { initialChoices } from '@/domains/statements';
import { addExpense, deleteExpense, restoreExpense, updateExpense } from '@/domains/expenses';
import type { AppServices } from '@/app/bootstrap';
import { createTestServices } from '@/test/services';
import { hasChanges } from '../domain/mergeBackup';
import { getBackupStatus } from './backupStatus';
import { applyImport, createBackup, previewImport, recordExport } from './backupUseCases';

const D = (day: string, time = '10:00') => new Date(`2026-09-${day}T${time}:00Z`);

const meat: ExpenseInput = {
  amount: 1240,
  categoryId: 'groceries' as CategoryId,
  subcategoryId: 'groceries.meat' as SubcategoryId,
  tagIds: [],
  date: '2026-09-20',
};

let iphone: AppServices;
let mac: AppServices;
beforeEach(async () => {
  iphone = await createTestServices();
  mac = await createTestServices();
});

async function add(device: AppServices, overrides: Partial<ExpenseInput>, now: Date) {
  const result = await addExpense(device, { ...meat, ...overrides }, now);
  if (!result.ok) throw new Error('ajout attendu');
  return result.expense.id;
}

/** Envoie de `from` vers `to` comme le ferait AirDrop, puis confirme l'import. */
async function transfer(from: AppServices, to: AppServices, now: Date) {
  const { text } = await createBackup(from.backup, now);
  const preview = await previewImport(to.backup, text);
  if (!preview.ok) throw new Error(`import refusé : ${preview.error}`);
  const summary = await applyImport(to.backup, preview.file, now);
  return { text, summary };
}

const visible = async (device: AppServices) =>
  (await device.expenses.findByMonth('2026-09' as never)).map((e) => ({
    id: e.id,
    amount: e.amount,
  }));

describe('iPhone → Mac', () => {
  it('l’aperçu ne modifie rien ; la confirmation copie les dépenses', async () => {
    await add(iphone, {}, D('20'));
    await add(iphone, { amount: 850 }, D('20', '11:00'));
    const { text } = await createBackup(iphone.backup, D('21'));

    const preview = await previewImport(mac.backup, text);
    expect(preview.ok && preview.plan.summary.expenses.added).toBe(2);
    expect(await visible(mac)).toEqual([]); // rien n'est écrit tant qu'on n'a pas confirmé

    if (!preview.ok) throw new Error('aperçu attendu');
    await applyImport(mac.backup, preview.file, D('21'));
    expect((await visible(mac)).map((e) => e.amount).sort((a, b) => a - b)).toEqual([850, 1240]);
  });

  it('importer deux fois le même fichier ne change plus rien', async () => {
    await add(iphone, {}, D('20'));
    const { text } = await transfer(iphone, mac, D('21'));
    const again = await previewImport(mac.backup, text);
    expect(again.ok && hasChanges(again.plan.summary)).toBe(false);
  });

  it('transmet une modification faite sur l’iPhone', async () => {
    const id = await add(iphone, {}, D('20'));
    await transfer(iphone, mac, D('21'));

    await updateExpense(iphone, id, { ...meat, amount: 2000 }, D('22'));
    const { summary } = await transfer(iphone, mac, D('22', '12:00'));
    expect(summary.expenses.updated).toBe(1);
    expect((await visible(mac))[0]?.amount).toBe(2000);
  });

  it('transmet une suppression, puis son annulation', async () => {
    const id = await add(iphone, {}, D('20'));
    await transfer(iphone, mac, D('21'));

    await deleteExpense(iphone.expenses, id, D('22'));
    const removed = await transfer(iphone, mac, D('22', '12:00'));
    expect(removed.summary.expenses.deleted).toBe(1);
    expect(await visible(mac)).toEqual([]);

    // « Annuler » sur l'iPhone : la dépense revient aussi sur le Mac.
    await restoreExpense(iphone.expenses, id, D('23'));
    await transfer(iphone, mac, D('23', '12:00'));
    expect(await visible(mac)).toHaveLength(1);
  });

  it('un fichier plus ancien n’écrase pas une correction faite sur le Mac', async () => {
    const id = await add(iphone, {}, D('20'));
    const oldFile = (await createBackup(iphone.backup, D('20', '12:00'))).text;
    await transfer(iphone, mac, D('20', '13:00'));

    await updateExpense(mac, id, { ...meat, amount: 3000 }, D('21'));
    const preview = await previewImport(mac.backup, oldFile);
    if (!preview.ok) throw new Error('aperçu attendu');
    await applyImport(mac.backup, preview.file, D('22'));
    expect((await visible(mac))[0]?.amount).toBe(3000);
  });
});

describe('les deux appareils ont bougé', () => {
  it('chacun récupère ce que l’autre a ajouté', async () => {
    await add(iphone, { amount: 100 }, D('20'));
    await add(mac, { amount: 200 }, D('20'));

    await transfer(iphone, mac, D('21'));
    await transfer(mac, iphone, D('21', '12:00'));

    const onIphone = (await visible(iphone)).map((e) => e.amount).sort((a, b) => a - b);
    const onMac = (await visible(mac)).map((e) => e.amount).sort((a, b) => a - b);
    expect(onIphone).toEqual([100, 200]);
    expect(onMac).toEqual(onIphone);
  });

  it('garde la modification la plus récente quand les deux ont modifié la même dépense', async () => {
    const id = await add(iphone, {}, D('20'));
    await transfer(iphone, mac, D('20', '12:00'));

    await updateExpense(iphone, id, { ...meat, amount: 111 }, D('21', '09:00'));
    await updateExpense(mac, id, { ...meat, amount: 222 }, D('21', '18:00')); // plus tard

    await transfer(iphone, mac, D('22'));
    await transfer(mac, iphone, D('22', '12:00'));
    expect((await visible(iphone))[0]?.amount).toBe(222);
    expect((await visible(mac))[0]?.amount).toBe(222);
  });

  it('fusionne un tag créé de chaque côté sous le même nom', async () => {
    const onIphone = await createTag(iphone.catalog, '#Porto', D('20'));
    const onMac = await createTag(mac.catalog, 'porto', D('20', '11:00'));
    expect(onIphone?.id).not.toBe(onMac?.id);
    await add(mac, { tagIds: [onMac!.id] }, D('20', '12:00'));

    await transfer(mac, iphone, D('21'));

    const { tags } = await iphone.catalog.load();
    expect(tags.filter((t) => t.name === 'porto')).toHaveLength(1);
    const [expense] = await iphone.expenses.findByMonth('2026-09' as never);
    expect(expense?.tagIds).toEqual([onIphone!.id]);
  });
});

describe('focus entre appareils', () => {
  const names = async (device: AppServices) => (await device.focus.list()).map((f) => f.targetId);

  it('les focus épinglés sur l’iPhone apparaissent sur le Mac, dans le même ordre', async () => {
    await addFocus(iphone.focus, { kind: 'subcategory', targetId: 'groceries.meat' }, D('20'));
    await addFocus(iphone.focus, { kind: 'category', targetId: 'transport' }, D('20', '11:00'));
    await transfer(iphone, mac, D('21'));
    expect(await names(mac)).toEqual(['groceries.meat', 'transport']);
  });

  it('un focus retiré sur l’iPhone disparaît aussi du Mac', async () => {
    const meatFocus = await addFocus(
      iphone.focus,
      { kind: 'subcategory', targetId: 'groceries.meat' },
      D('20'),
    );
    await transfer(iphone, mac, D('21'));
    await removeFocus(iphone.focus, meatFocus.id, D('22'));
    await transfer(iphone, mac, D('22', '12:00'));
    expect(await names(mac)).toEqual([]);
  });

  it('la même cible épinglée des deux côtés ne donne qu’un focus', async () => {
    await addFocus(iphone.focus, { kind: 'category', targetId: 'transport' }, D('20'));
    await addFocus(mac.focus, { kind: 'category', targetId: 'transport' }, D('20', '11:00'));
    await transfer(iphone, mac, D('21'));
    expect(await names(mac)).toEqual(['transport']);
  });
});

describe('relevé bancaire importé sur les deux appareils', () => {
  const HEADER =
    'Type,Produit,Date de début,Date de fin,Description,Montant,Frais,Devise,État,Solde';
  const RELEVE = [
    HEADER,
    'Paiement par carte,Valeur actuelle,2026-09-05 12:00:00,2026-09-05 12:00:00,Continente,-20.00,0.00,EUR,TERMINÉ,1',
  ].join('\n');

  async function importOn(device: AppServices, at: Date) {
    const preview = await previewStatement(device, RELEVE, DEFAULT_STAY);
    if (!preview.ok) throw new Error('relevé refusé');
    await importStatement(device, preview.plan, initialChoices(preview.plan), at);
  }

  it('ne crée pas de doublon quand l’autre appareil envoie ses données', async () => {
    await importOn(iphone, D('21'));
    await importOn(mac, D('21'));
    await transfer(iphone, mac, D('22'));
    expect(await visible(mac)).toHaveLength(1);
    await transfer(mac, iphone, D('22', '12:00'));
    expect(await visible(iphone)).toHaveLength(1);
  });

  it('transmet le commerçant et les règles apprises', async () => {
    await importOn(iphone, D('21'));
    await iphone.merchantRules.put([
      {
        id: 'nobby',
        categoryId: 'shopping' as never,
        subcategoryId: null,
        ignore: false,
        updatedAt: '2026-09-21T10:00:00.000Z' as never,
        deletedAt: null,
      },
    ]);
    await transfer(iphone, mac, D('22'));
    expect((await mac.expenses.findByMonth('2026-09' as never))[0]?.note).toBe('Continente');
    expect((await mac.merchantRules.list()).map((r) => r.id)).toEqual(['nobby']);
  });
});

describe('fichier refusé', () => {
  it.each([
    ['pas du JSON', 'ceci nest pas un fichier', 'notJson'],
    ['un autre JSON', '{"foo":1}', 'notABackup'],
  ])('%s : rien n’est touché', async (_label, text, error) => {
    await add(mac, {}, D('20'));
    const before = await visible(mac);
    expect(await previewImport(mac.backup, text)).toEqual({ ok: false, error });
    expect(await visible(mac)).toEqual(before);
  });
});

describe('état de la sauvegarde', () => {
  it('rien à rappeler quand tout a été exporté', async () => {
    await add(iphone, {}, D('01'));
    await recordExport(iphone.backup, D('02'));
    expect((await getBackupStatus(iphone.backup)).oldestUnsavedChange).toBeNull();
  });

  it('signale la plus ancienne modification faite depuis le dernier export', async () => {
    await add(iphone, {}, D('01'));
    await recordExport(iphone.backup, D('02'));
    await add(iphone, { amount: 5 }, D('10'));
    await add(iphone, { amount: 6 }, D('12'));
    const status = await getBackupStatus(iphone.backup);
    expect(status.lastExportAt).toBe('2026-09-02T10:00:00.000Z');
    expect(status.oldestUnsavedChange).toBe('2026-09-10T10:00:00.000Z');
  });

  it('un appareil qui ne fait qu’importer (le Mac) n’est jamais relancé', async () => {
    await add(iphone, {}, D('01'));
    await transfer(iphone, mac, D('05'));
    const status = await getBackupStatus(mac.backup);
    expect(status.lastImportAt).toBe('2026-09-05T10:00:00.000Z');
    expect(status.oldestUnsavedChange).toBeNull();
  });

  it('une première utilisation, sans aucune dépense, ne rappelle rien', async () => {
    expect((await getBackupStatus(iphone.backup)).oldestUnsavedChange).toBeNull();
  });
});
