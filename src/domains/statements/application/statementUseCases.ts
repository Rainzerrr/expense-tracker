import type { CatalogRepository } from '@/domains/categorization';
import { createSubcategoryLookup } from '@/domains/categorization';
import { createExpense } from '@/domains/expenses';
import type { Cents, ExpenseId, ExpenseRepository } from '@/domains/expenses';
import type { Stay } from '@/domains/stay';
import { newId } from '@/shared/lib/ids';
import { nowInstant } from '@/shared/lib/time';
import { buildExpenseInputs, planStatementImport, rulesToLearn } from '../domain/importPlan';
import type { Choices, ImportPlan } from '../domain/importPlan';
import type { MerchantRuleRepository } from '../domain/MerchantRuleRepository';
import { parseRevolutStatement } from '../domain/revolutStatement';
import type { ParseStatementError } from '../domain/revolutStatement';

export interface StatementDeps {
  expenses: ExpenseRepository;
  catalog: CatalogRepository;
  merchantRules: MerchantRuleRepository;
}

export type StatementPreview =
  { ok: true; plan: ImportPlan } | { ok: false; error: ParseStatementError };

/** Lit le relevé et prépare le plan d'import, sans rien écrire. */
export async function previewStatement(
  deps: StatementDeps,
  text: string,
  stay: Stay,
): Promise<StatementPreview> {
  const parsed = parseRevolutStatement(text);
  if (!parsed.ok) return parsed;
  const [existingRefs, rules, catalog] = await Promise.all([
    deps.expenses.externalRefs(),
    deps.merchantRules.list(),
    deps.catalog.load(),
  ]);
  return {
    ok: true,
    plan: planStatementImport({
      rows: parsed.rows,
      unreadableRows: parsed.unreadableRows,
      existingRefs,
      stay,
      rules,
      catalog,
    }),
  };
}

export interface StatementImportResult {
  imported: number;
  total: Cents;
  /** Opérations déjà importées entre l'aperçu et la confirmation (ou refusées par le domaine). */
  skipped: number;
  learnedRules: number;
}

/**
 * Crée les dépenses choisies et retient les règles apprises. Les références sont revérifiées ici :
 * si une opération a été importée entre l'aperçu et la confirmation, elle n'est pas dupliquée.
 */
export async function importStatement(
  deps: StatementDeps,
  plan: ImportPlan,
  choices: Choices,
  now: Date = new Date(),
): Promise<StatementImportResult> {
  const [existingRefs, { subcategories }] = await Promise.all([
    deps.expenses.externalRefs(),
    deps.catalog.load(),
  ]);
  const isSubcategoryOf = createSubcategoryLookup(subcategories);
  const at = nowInstant(now);

  const created = [];
  let skipped = 0;
  for (const input of buildExpenseInputs(plan, choices)) {
    if (input.externalRef && existingRefs.has(input.externalRef)) {
      skipped += 1;
      continue;
    }
    const result = createExpense(input, { id: newId() as ExpenseId, now: at, isSubcategoryOf });
    if (result.ok) created.push(result.expense);
    else skipped += 1;
  }

  const rules = rulesToLearn(plan, choices, at);
  // Les règles d'abord : si l'écriture des dépenses échoue, l'utilisateur n'aura pas à reclasser.
  await deps.merchantRules.put(rules);
  await deps.expenses.addMany(created);

  const total = created.reduce((sum, e) => sum + e.amount, 0) as Cents;
  return { imported: created.length, total, skipped, learnedRules: rules.length };
}
