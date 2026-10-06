import type { AppServices } from '@/app/bootstrap';
import type { CategoryId, SubcategoryId } from '@/domains/categorization';
import { addExpense, deleteExpense } from '@/domains/expenses';
import type { ExpenseId } from '@/domains/expenses';
import { createTestServices, memorySyncServer, TEST_NOW } from '@/test/services';
import { createSyncHandler, memoryVaultStore } from '../../../../api/sync';
import { SyncError } from '../domain/SyncServer';
import type { SyncServer } from '../domain/SyncServer';
import { generateSyncCode } from '../domain/syncCode';
import type { SyncCode } from '../domain/syncCode';
import { HttpSyncServer } from '../infrastructure/HttpSyncServer';
import { syncNow } from './syncNow';

const groceries = (amount: number, date = '2026-09-20') => ({
  amount,
  categoryId: 'groceries' as CategoryId,
  subcategoryId: 'groceries.meat' as SubcategoryId,
  tagIds: [],
  date,
});

const later = (minutes: number) => new Date(TEST_NOW.getTime() + minutes * 60_000);

async function add(device: AppServices, amount: number, now = TEST_NOW): Promise<ExpenseId> {
  const result = await addExpense(device, groceries(amount), now);
  if (!result.ok) throw new Error('dépense invalide');
  return result.expense.id;
}

const activeAmounts = async (device: AppServices) =>
  (await device.backup.readAll()).expenses
    .filter((expense) => expense.deletedAt === null)
    .map((expense) => expense.amount)
    .sort((a, b) => a - b);

/** Un iPhone et un Mac, reliés au même serveur avec le même code. */
async function twoDevices(server: SyncServer = memorySyncServer()) {
  const code = generateSyncCode();
  const iphone = await createTestServices({ syncServer: server });
  const mac = await createTestServices({ syncServer: server });
  const sync = (device: AppServices, now = TEST_NOW) =>
    syncNow({ backup: device.backup, server: device.syncServer, code, now });
  return { iphone, mac, sync, code };
}

describe('synchronisation entre deux appareils', () => {
  it('fait passer les dépenses de l’iPhone au Mac', async () => {
    const { iphone, mac, sync } = await twoDevices();
    await add(iphone, 1240);
    await add(iphone, 560);

    expect(await sync(iphone)).toMatchObject({ received: null, pushed: true });
    const onMac = await sync(mac);

    expect(onMac.received?.expenses.added).toBe(2);
    expect(await activeAmounts(mac)).toEqual([560, 1240]);
  });

  it('fusionne dans les deux sens, sans rien perdre', async () => {
    const { iphone, mac, sync } = await twoDevices();
    await add(iphone, 1000);
    await add(mac, 2000); // saisie aussi sur le Mac avant toute synchro

    await sync(iphone);
    await sync(mac);
    await sync(iphone);

    expect(await activeAmounts(iphone)).toEqual([1000, 2000]);
    expect(await activeAmounts(mac)).toEqual([1000, 2000]);
  });

  it('propage les suppressions, et une dépense supprimée ne revient pas', async () => {
    const { iphone, mac, sync } = await twoDevices();
    const id = await add(iphone, 1240);
    await sync(iphone);
    await sync(mac);

    await deleteExpense(mac.expenses, id, later(5));
    await sync(mac, later(5));
    await sync(iphone, later(6));

    expect(await activeAmounts(iphone)).toEqual([]);
    await sync(mac, later(7));
    expect(await activeAmounts(mac)).toEqual([]);
  });

  it('n’envoie rien quand le serveur a déjà tout (resynchroniser ne change rien)', async () => {
    const { iphone, mac, sync } = await twoDevices();
    await add(iphone, 1240);
    await sync(iphone);
    await sync(mac);

    expect(await sync(iphone)).toMatchObject({ pushed: false });
    expect(await sync(mac)).toMatchObject({ pushed: false });
    expect(await activeAmounts(mac)).toEqual([1240]);
  });

  it('note ce que le serveur a reçu : plus rien en attente après une synchro', async () => {
    const { iphone, sync } = await twoDevices();
    await add(iphone, 1240);
    expect(await iphone.backup.getMeta('lastSyncAt')).toBeNull();

    await sync(iphone);

    expect(await iphone.backup.getMeta('lastSyncAt')).toBe(TEST_NOW.toISOString());
    const through = await iphone.backup.getMeta('syncedThrough');
    expect(await iphone.backup.oldestChangeSince(through)).toBeNull();
  });

  it('recommence quand un autre appareil a écrit entre la lecture et l’envoi', async () => {
    const store = memoryVaultStore();
    const handle = createSyncHandler(store);
    const { iphone, mac, sync, code } = await twoDevices(memorySyncServer(store));
    await add(mac, 2000);

    // Le Mac envoie juste après que l'iPhone a lu le coffre : l'envoi de l'iPhone est refusé.
    let interfere = true;
    const statuses: number[] = [];
    const racing = new HttpSyncServer(async (input, init) => {
      const response = await handle(new Request(new URL(input, 'http://test'), init));
      statuses.push(response.status);
      if (interfere && init?.method === 'GET') {
        interfere = false;
        await sync(mac);
      }
      return response;
    });
    await add(iphone, 1000);
    await syncNow({ backup: iphone.backup, server: racing, code: code as SyncCode, now: TEST_NOW });

    expect(statuses).toEqual([204, 409, 200, 200]); // lu vide, refusé, relu, envoyé
    expect(await activeAmounts(iphone)).toEqual([1000, 2000]);
    await sync(mac);
    expect(await activeAmounts(mac)).toEqual([1000, 2000]);
  });

  it('signale l’absence de réseau sans rien modifier', async () => {
    const offline = new HttpSyncServer(() => Promise.reject(new TypeError('Failed to fetch')));
    const { iphone, code } = await twoDevices(offline);
    await add(iphone, 1240);

    await expect(
      syncNow({ backup: iphone.backup, server: offline, code, now: TEST_NOW }),
    ).rejects.toEqual(new SyncError('offline'));
    expect(await iphone.backup.getMeta('lastSyncAt')).toBeNull();
  });
});
