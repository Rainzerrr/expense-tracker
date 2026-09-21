import { newId } from '@/shared/lib/ids';
import { nowInstant, todayInLisbon } from '@/shared/lib/time';
import { buildDemoExpenses } from '../domain/demoExpenses';
import type { ExpenseRepository } from '../domain/ExpenseRepository';

/** Remplit la base de démo au premier lancement. Ne fait rien si elle contient déjà des dépenses. */
export async function seedDemoExpenses(
  repository: ExpenseRepository,
  now: Date = new Date(),
): Promise<void> {
  if (!(await repository.isEmpty())) return;
  await repository.addMany(buildDemoExpenses(todayInLisbon(now), nowInstant(now), newId));
}
