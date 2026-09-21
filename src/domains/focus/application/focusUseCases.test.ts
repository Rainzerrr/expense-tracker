import { createTestServices } from '@/test/services';
import type { AppServices } from '@/app/bootstrap';
import type { FocusRepository } from '../domain/FocusRepository';
import { addFocus, moveFocus, removeFocus, seedDemoFocuses } from './focusUseCases';

const D = (time: string) => new Date(`2026-09-20T${time}:00Z`);
let services: AppServices;
let repo: FocusRepository;
beforeEach(async () => {
  services = await createTestServices();
  repo = services.focus;
});

const labels = async () => (await repo.list()).map((f) => `${f.kind}:${f.targetId}`);

describe('addFocus', () => {
  it('épingle à la suite des autres', async () => {
    await addFocus(repo, { kind: 'subcategory', targetId: 'groceries.meat' }, D('10:00'));
    await addFocus(repo, { kind: 'category', targetId: 'transport' }, D('10:01'));
    await addFocus(repo, { kind: 'tag', targetId: 'avec-amis' }, D('10:02'));
    expect(await labels()).toEqual([
      'subcategory:groceries.meat',
      'category:transport',
      'tag:avec-amis',
    ]);
    expect((await repo.list()).map((f) => f.position)).toEqual([0, 1, 2]);
  });

  it('ne crée pas de doublon pour une cible déjà suivie', async () => {
    const first = await addFocus(repo, { kind: 'category', targetId: 'transport' });
    const again = await addFocus(repo, { kind: 'category', targetId: 'transport' });
    expect(again.id).toBe(first.id);
    expect(await repo.list()).toHaveLength(1);
  });

  it('distingue une catégorie et une sous-catégorie du même nom', async () => {
    await addFocus(repo, { kind: 'category', targetId: 'x' });
    await addFocus(repo, { kind: 'subcategory', targetId: 'x' });
    expect(await repo.list()).toHaveLength(2);
  });
});

describe('removeFocus', () => {
  it('retire de la liste par suppression logique (elle se propage à l’autre appareil)', async () => {
    const focus = await addFocus(repo, { kind: 'category', targetId: 'transport' }, D('10:00'));
    await removeFocus(repo, focus.id, D('11:00'));
    expect(await repo.list()).toEqual([]);
    const stored = await services.db.focuses.get(focus.id);
    expect(stored).toMatchObject({
      deletedAt: '2026-09-20T11:00:00.000Z',
      updatedAt: '2026-09-20T11:00:00.000Z',
    });
  });

  it('peut re-épingler une cible retirée', async () => {
    const focus = await addFocus(repo, { kind: 'category', targetId: 'transport' });
    await removeFocus(repo, focus.id);
    await addFocus(repo, { kind: 'category', targetId: 'transport' });
    expect(await repo.list()).toHaveLength(1);
  });

  it('ignore un identifiant inconnu', async () => {
    await expect(removeFocus(repo, 'inconnu' as never)).resolves.toBeUndefined();
  });
});

describe('moveFocus', () => {
  async function three() {
    const a = await addFocus(repo, { kind: 'category', targetId: 'a' }, D('10:00'));
    const b = await addFocus(repo, { kind: 'category', targetId: 'b' }, D('10:01'));
    const c = await addFocus(repo, { kind: 'category', targetId: 'c' }, D('10:02'));
    return { a, b, c };
  }
  const order = async () => (await repo.list()).map((f) => f.targetId);

  it('monte et descend d’un cran', async () => {
    const { c, a } = await three();
    await moveFocus(repo, c.id, 'up');
    expect(await order()).toEqual(['a', 'c', 'b']);
    await moveFocus(repo, a.id, 'down');
    expect(await order()).toEqual(['c', 'a', 'b']);
  });

  it('ne fait rien aux extrémités', async () => {
    const { a, c } = await three();
    await moveFocus(repo, a.id, 'up');
    await moveFocus(repo, c.id, 'down');
    expect(await order()).toEqual(['a', 'b', 'c']);
  });

  it('ne réécrit que les focus dont la position change', async () => {
    const { b } = await three();
    await moveFocus(repo, b.id, 'up', D('12:00'));
    const stored = await services.db.focuses.toArray();
    const touched = stored
      .filter((f) => f.updatedAt === '2026-09-20T12:00:00.000Z')
      .map((f) => f.targetId)
      .sort();
    expect(touched).toEqual(['a', 'b']);
  });

  it('remet des positions propres même après une fusion qui les a fait se chevaucher', async () => {
    const { a, b } = await three();
    await services.db.focuses.update(a.id, { position: 1 }); // a et b partagent la position 1
    await services.db.focuses.update(b.id, { position: 1 });
    await moveFocus(repo, b.id, 'up');
    expect((await repo.list()).map((f) => f.position)).toEqual([0, 1, 2]);
  });
});

describe('seedDemoFocuses', () => {
  it('épingle les trois focus des maquettes, une seule fois', async () => {
    await seedDemoFocuses(repo);
    await seedDemoFocuses(repo);
    expect(await labels()).toEqual([
      'subcategory:groceries.meat',
      'category:transport',
      'subcategory:activities.restaurants',
    ]);
  });
});
