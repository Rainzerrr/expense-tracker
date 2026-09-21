import { newId } from '@/shared/lib/ids';
import { nowInstant } from '@/shared/lib/time';
import { sameTarget } from '../domain/focus';
import type { Focus, FocusId, FocusTarget } from '../domain/focus';
import type { FocusRepository } from '../domain/FocusRepository';

/** Épingle un focus. Si la cible est déjà suivie, retourne le focus existant (pas de doublon). */
export async function addFocus(
  repository: FocusRepository,
  target: FocusTarget,
  now: Date = new Date(),
): Promise<Focus> {
  const existing = await repository.list();
  const twin = existing.find((focus) => sameTarget(focus, target));
  if (twin) return twin;

  const focus: Focus = {
    id: newId() as FocusId,
    kind: target.kind,
    targetId: target.targetId,
    position: existing.length > 0 ? Math.max(...existing.map((f) => f.position)) + 1 : 0,
    updatedAt: nowInstant(now),
    deletedAt: null,
  };
  await repository.put([focus]);
  return focus;
}

/** Suppression logique : elle se propage aux autres appareils comme une modification. */
export async function removeFocus(
  repository: FocusRepository,
  id: FocusId,
  now: Date = new Date(),
): Promise<void> {
  const focus = (await repository.list()).find((f) => f.id === id);
  if (!focus) return;
  const at = nowInstant(now);
  await repository.put([{ ...focus, deletedAt: at, updatedAt: at }]);
}

/**
 * Déplace un focus d'un cran. Les positions sont recalculées de 0 à n-1 : après une fusion entre
 * appareils elles peuvent se chevaucher, l'ordre visible reste alors celui que l'on manipule.
 * Seuls les focus dont la position change sont réécrits.
 */
export async function moveFocus(
  repository: FocusRepository,
  id: FocusId,
  direction: 'up' | 'down',
  now: Date = new Date(),
): Promise<void> {
  const ordered = await repository.list();
  const index = ordered.findIndex((focus) => focus.id === id);
  const target = direction === 'up' ? index - 1 : index + 1;
  if (index === -1 || target < 0 || target >= ordered.length) return;

  const reordered = [...ordered];
  const [moved] = reordered.splice(index, 1);
  reordered.splice(target, 0, moved as Focus);

  const at = nowInstant(now);
  const changed = reordered.flatMap((focus, position) =>
    focus.position === position ? [] : [{ ...focus, position, updatedAt: at }],
  );
  await repository.put(changed);
}

/** Pour la démo : les trois focus des maquettes (viande, transport, restaurants). */
export async function seedDemoFocuses(repository: FocusRepository, now: Date = new Date()) {
  if (!(await repository.isEmpty())) return;
  await addFocus(repository, { kind: 'subcategory', targetId: 'groceries.meat' }, now);
  await addFocus(repository, { kind: 'category', targetId: 'transport' }, now);
  await addFocus(repository, { kind: 'subcategory', targetId: 'activities.restaurants' }, now);
}
