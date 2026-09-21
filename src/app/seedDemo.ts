import { seedDemoExpenses } from '@/domains/expenses';
import type { ExpenseRepository } from '@/domains/expenses';
import { seedDemoFocuses } from '@/domains/focus';
import type { FocusRepository } from '@/domains/focus';

/**
 * Remplit la base de démo (dépenses et focus des maquettes). Chargé à la demande depuis `bootstrap` :
 * ces données n'ont aucune raison d'alourdir le démarrage de l'application réelle.
 */
export async function seedDemo(
  repositories: { expenses: ExpenseRepository; focus: FocusRepository },
  now?: Date,
): Promise<void> {
  await seedDemoExpenses(repositories.expenses, now);
  await seedDemoFocuses(repositories.focus, now);
}
