import { z } from 'zod';
import { CATEGORY_COLORS } from '@/domains/categorization';
import { isLocalDate } from '@/shared/lib/time';
import { BACKUP_FORMAT, BACKUP_VERSION } from './backupFile';
import type { BackupFile, ParseBackupResult } from './backupFile';

// Ce module est le seul à dépendre de Zod : il n'est chargé qu'au moment d'importer un fichier
// (import dynamique dans `previewImport`), pas au démarrage de l'application.

const instant = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/);
const nullableInstant = instant.nullable();
const id = z.string().min(1).max(100);

const expenseSchema = z.object({
  id,
  amount: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  categoryId: id,
  subcategoryId: id.nullable(),
  tagIds: z.array(id),
  // Retour `boolean` explicite : sans lui, TypeScript infère un type-guard (voir expenseFormSchema).
  date: z.string().refine((value): boolean => isLocalDate(value)),
  createdAt: instant,
  updatedAt: instant,
  deletedAt: nullableInstant,
  note: z.string().max(300).optional(),
  externalRef: z.string().max(300).optional(),
});

const categorySchema = z.object({
  id,
  systemKey: z.string().nullable(),
  name: z.string().nullable(),
  color: z.enum(CATEGORY_COLORS),
  position: z.number().int(),
  updatedAt: instant,
  deletedAt: nullableInstant,
});

const subcategorySchema = z.object({
  id,
  categoryId: id,
  systemKey: z.string().nullable(),
  name: z.string().nullable(),
  position: z.number().int(),
  updatedAt: instant,
  deletedAt: nullableInstant,
});

const tagSchema = z.object({
  id,
  name: z.string().min(1),
  updatedAt: instant,
  deletedAt: nullableInstant,
});

const focusSchema = z.object({
  id,
  kind: z.enum(['category', 'subcategory', 'tag']),
  targetId: id,
  position: z.number().int(),
  updatedAt: instant,
  deletedAt: nullableInstant,
});

const merchantRuleSchema = z.object({
  id: z.string().min(1).max(300),
  categoryId: id.nullable(),
  subcategoryId: id.nullable(),
  ignore: z.boolean(),
  updatedAt: instant,
  deletedAt: nullableInstant,
});

const budgetSchema = z.object({
  housingCents: z.number().int().nonnegative(),
  flexCents: z.number().int().nonnegative(),
  totalCents: z.number().int().nonnegative(),
  updatedAt: instant,
});

const backupSchema = z.object({
  format: z.literal(BACKUP_FORMAT),
  version: z.number().int().positive(),
  exportedAt: instant,
  data: z.object({
    expenses: z.array(expenseSchema),
    categories: z.array(categorySchema),
    subcategories: z.array(subcategorySchema),
    tags: z.array(tagSchema),
    // Les sauvegardes d'avant les focus n'ont pas cette section : elle vaut alors « aucun focus ».
    focuses: z.array(focusSchema).default([]),
    merchantRules: z.array(merchantRuleSchema).default([]),
    // Absent des fichiers créés avant le budget : le budget par défaut est alors utilisé.
    budget: budgetSchema.nullable().default(null),
  }),
});

/**
 * Lit et valide un fichier avant d'y toucher : rien n'est écrit tant que tout n'est pas conforme.
 * Les champs inconnus sont ignorés ; une version plus récente que la nôtre est refusée.
 */
export function parseBackup(text: string): ParseBackupResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: 'notJson' };
  }

  if (
    typeof raw !== 'object' ||
    raw === null ||
    (raw as { format?: unknown }).format !== BACKUP_FORMAT
  ) {
    return { ok: false, error: 'notABackup' };
  }
  const version = (raw as { version?: unknown }).version;
  if (typeof version === 'number' && version > BACKUP_VERSION) {
    return { ok: false, error: 'newerVersion' };
  }

  const parsed = backupSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: 'invalid' };
  // La validation garantit la forme ; les types nominaux (ExpenseId, LocalDate…) ne sont que des étiquettes.
  return { ok: true, file: parsed.data as unknown as BackupFile };
}
