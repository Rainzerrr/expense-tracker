import { ensureDefaultCatalog } from '@/domains/categorization';
import type { CatalogRepository } from '@/domains/categorization';
import { DexieCatalogRepository } from '@/domains/categorization/infrastructure';
import type { FocusRepository } from '@/domains/focus';
import { DexieFocusRepository } from '@/domains/focus/infrastructure';
import type { ExpenseRepository } from '@/domains/expenses';
import { DexieExpenseRepository } from '@/domains/expenses/infrastructure';
import type { BackupRepository } from '@/domains/backup';
import { DexieBackupRepository } from '@/domains/backup/infrastructure';
import { AppDatabase, DATABASE_NAME, DEMO_DATABASE_NAME } from '@/shared/infrastructure/database';
import { resolveDemoMode } from '@/shared/infrastructure/demoMode';
import type { SessionStorageLike } from '@/shared/infrastructure/demoMode';

/** Ce que l'interface reçoit au démarrage : dépôts prêts à l'emploi et mode courant. */
export interface AppServices {
  db: AppDatabase;
  expenses: ExpenseRepository;
  catalog: CatalogRepository;
  backup: BackupRepository;
  focus: FocusRepository;
  isDemo: boolean;
  /** Horloge injectable : les tests figent la date. */
  now: () => Date;
}

export interface BootstrapOptions {
  search: string;
  storage: SessionStorageLike | null;
  /** Pour les tests : isole chaque test dans sa propre base. */
  databaseName?: string;
  /** Date fixe pour les tests. Par défaut : l'heure réelle. */
  now?: Date;
}

export const databaseNameFor = (isDemo: boolean) => (isDemo ? DEMO_DATABASE_NAME : DATABASE_NAME);

/** Composition root : le seul endroit qui relie les ports du domaine à Dexie. */
export async function bootstrap({
  search,
  storage,
  databaseName,
  now,
}: BootstrapOptions): Promise<AppServices> {
  const isDemo = resolveDemoMode(search, storage);
  const db = new AppDatabase(databaseName ?? databaseNameFor(isDemo));
  await db.open();

  const catalog = new DexieCatalogRepository(db);
  const expenses = new DexieExpenseRepository(db);
  const backup = new DexieBackupRepository(db);
  const focus = new DexieFocusRepository(db);

  await ensureDefaultCatalog(catalog);
  if (isDemo) {
    const { seedDemo } = await import('./seedDemo');
    await seedDemo({ expenses, focus }, now);
  }

  return { db, expenses, catalog, backup, focus, isDemo, now: () => now ?? new Date() };
}
