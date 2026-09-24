import type { Catalog, CategoryId, SubcategoryId } from '@/domains/categorization';
import { normalizeSearchText } from '@/domains/expenses';
import type { Cents, ExpenseInput } from '@/domains/expenses';
import type { Stay } from '@/domains/stay';
import type { IsoInstant, LocalDate } from '@/shared/lib/time';
import { classifyMerchant, merchantKey, sameClassification } from './merchantRules';
import type { Classification, MerchantRule } from './merchantRules';
import type { StatementRow } from './revolutStatement';

export type SkipReason =
  | 'pending'
  | 'notCompleted'
  | 'foreignCurrency'
  | 'topUp'
  | 'incoming'
  | 'otherType'
  | 'outsideStay'
  | 'alreadyImported';

export interface ImportCandidate {
  /** Identité de l'opération : elle empêche de l'importer deux fois. */
  ref: string;
  date: LocalDate;
  cents: Cents;
}

export interface MerchantGroup {
  key: string;
  /** Le commerçant tel que la banque l'écrit (première occurrence). */
  label: string;
  candidates: ImportCandidate[];
  total: Cents;
  suggestion: Classification;
  /** À regarder avant d'importer : commerçant inconnu, ou opération ambiguë (virement, retrait). */
  needsReview: boolean;
}

export interface ImportPlan {
  groups: MerchantGroup[];
  candidateCount: number;
  total: Cents;
  skipped: Record<SkipReason, number>;
  /** Types d'opérations ignorés, avec leur nombre, pour que rien ne disparaisse en silence. */
  ignoredTypes: Record<string, number>;
  unreadableRows: number;
}

export interface PlanInput {
  rows: readonly StatementRow[];
  unreadableRows: number;
  /** Références déjà importées, y compris celles de dépenses supprimées depuis. */
  existingRefs: ReadonlySet<string>;
  stay: Stay;
  rules: readonly MerchantRule[];
  catalog: Catalog;
}

const TOP_UP_TYPES = ['ajout de fonds', 'top up', 'top-up', 'topup'];
const EXPENSE_TYPES = [
  'paiement par carte',
  'card payment',
  'frais',
  'fee',
  'prelevement',
  'direct debit',
];
// Un virement peut être le loyer ou un remboursement à un ami ; un retrait, des espèces : à décider par l'utilisateur.
const AMBIGUOUS_TYPES = ['virement', 'transfer', 'retrait', 'atm', 'cash withdrawal'];

const startsWithAny = (type: string, list: readonly string[]) =>
  list.some((item) => type.startsWith(item));

export const emptySkipped = (): Record<SkipReason, number> => ({
  pending: 0,
  notCompleted: 0,
  foreignCurrency: 0,
  topUp: 0,
  incoming: 0,
  otherType: 0,
  outsideStay: 0,
  alreadyImported: 0,
});

/**
 * La référence d'une opération : début, commerçant, montant et frais. Deux opérations réellement
 * identiques (même seconde) se distinguent par leur rang dans le fichier.
 */
function buildRefs(rows: readonly StatementRow[]): string[] {
  const seen = new Map<string, number>();
  return rows.map((row) => {
    const base = `revolut:${row.startedAt}|${row.description}|${row.amountCents}|${row.feeCents}`;
    const rank = seen.get(base) ?? 0;
    seen.set(base, rank + 1);
    return rank === 0 ? base : `${base}#${rank}`;
  });
}

const isKnown = (classification: Classification, catalog: Catalog) =>
  classification.ignore ||
  (classification.categoryId !== null &&
    catalog.categories.some((c) => c.id === classification.categoryId) &&
    (classification.subcategoryId === null ||
      catalog.subcategories.some(
        (s) => s.id === classification.subcategoryId && s.categoryId === classification.categoryId,
      )));

/** Trie les opérations d'un relevé : à importer (regroupées par commerçant) ou à ignorer (avec la raison). */
export function planStatementImport(input: PlanInput): ImportPlan {
  const { rows, existingRefs, stay, rules, catalog } = input;
  const skipped = emptySkipped();
  const ignoredTypes: Record<string, number> = {};
  const refs = buildRefs(rows);
  const groups = new Map<string, MerchantGroup & { ambiguous: boolean }>();

  rows.forEach((row, index) => {
    const type = normalizeSearchText(row.type);

    if (row.state === 'pending') return void (skipped.pending += 1);
    if (row.state === 'other') return void (skipped.notCompleted += 1);
    if (row.currency !== 'EUR') return void (skipped.foreignCurrency += 1);
    if (row.amountCents >= 0) {
      return void (startsWithAny(type, TOP_UP_TYPES)
        ? (skipped.topUp += 1)
        : (skipped.incoming += 1));
    }

    const isExpense = startsWithAny(type, EXPENSE_TYPES);
    const isAmbiguous = !isExpense && startsWithAny(type, AMBIGUOUS_TYPES);
    if (!isExpense && !isAmbiguous) {
      skipped.otherType += 1;
      ignoredTypes[row.type] = (ignoredTypes[row.type] ?? 0) + 1;
      return;
    }
    if (row.date < stay.start || row.date > stay.end) return void (skipped.outsideStay += 1);

    const ref = refs[index] as string;
    if (existingRefs.has(ref)) return void (skipped.alreadyImported += 1);

    const key = merchantKey(row.description);
    const cents = (Math.abs(row.amountCents) + row.feeCents) as Cents;
    const existing = groups.get(key);
    if (existing) {
      existing.candidates.push({ ref, date: row.date, cents });
      existing.total = (existing.total + cents) as Cents;
      existing.ambiguous ||= isAmbiguous;
      return;
    }
    groups.set(key, {
      key,
      label: row.description,
      candidates: [{ ref, date: row.date, cents }],
      total: cents,
      suggestion: { categoryId: null, subcategoryId: null, ignore: false, source: 'unknown' },
      needsReview: false,
      ambiguous: isAmbiguous,
    });
  });

  const resolved = [...groups.values()].map(({ ambiguous, ...group }): MerchantGroup => {
    let suggestion = classifyMerchant(group.key, rules);
    if (!isKnown(suggestion, catalog))
      suggestion = {
        ...suggestion,
        categoryId: null,
        subcategoryId: null,
        ignore: false,
        source: 'unknown',
      };
    // Un virement ou un retrait n'est pas importé tant que l'utilisateur ne l'a pas décidé.
    if (ambiguous && suggestion.source !== 'user')
      suggestion = { categoryId: null, subcategoryId: null, ignore: true, source: 'unknown' };
    return { ...group, suggestion, needsReview: suggestion.source === 'unknown' };
  });
  resolved.sort((a, b) => Number(b.needsReview) - Number(a.needsReview) || b.total - a.total);

  return {
    groups: resolved,
    candidateCount: resolved.reduce((sum, g) => sum + g.candidates.length, 0),
    total: resolved.reduce((sum, g) => sum + g.total, 0) as Cents,
    skipped,
    ignoredTypes,
    unreadableRows: input.unreadableRows,
  };
}

/** Le choix de l'utilisateur pour un commerçant. */
export type MerchantChoice =
  { ignore: true } | { ignore: false; categoryId: CategoryId; subcategoryId: SubcategoryId | null };

export type Choices = Readonly<Record<string, MerchantChoice | undefined>>;

/** Les propositions du plan, à corriger. Un commerçant inconnu n'a pas encore de choix. */
export function initialChoices(plan: ImportPlan): Record<string, MerchantChoice | undefined> {
  return Object.fromEntries(
    plan.groups.map((group): [string, MerchantChoice | undefined] => {
      const { suggestion } = group;
      if (suggestion.ignore) return [group.key, { ignore: true }];
      if (suggestion.categoryId) {
        return [
          group.key,
          {
            ignore: false,
            categoryId: suggestion.categoryId,
            subcategoryId: suggestion.subcategoryId,
          },
        ];
      }
      return [group.key, undefined];
    }),
  );
}

/** Commerçants pour lesquels il reste à choisir : l'import n'est possible qu'à zéro. */
export const unresolvedCount = (plan: ImportPlan, choices: Choices) =>
  plan.groups.filter((group) => choices[group.key] === undefined).length;

/** Ce qui sera réellement importé avec ces choix. */
export function summarizeChoices(plan: ImportPlan, choices: Choices) {
  const imported = plan.groups.filter((g) => choices[g.key] && !choices[g.key]?.ignore);
  return {
    count: imported.reduce((sum, g) => sum + g.candidates.length, 0),
    total: imported.reduce((sum, g) => sum + g.total, 0) as Cents,
  };
}

/** Les dépenses à créer : une par opération, avec le commerçant en note et la référence d'origine. */
export function buildExpenseInputs(plan: ImportPlan, choices: Choices): ExpenseInput[] {
  return plan.groups.flatMap((group) => {
    const choice = choices[group.key];
    if (!choice || choice.ignore) return [];
    return group.candidates.map((candidate): ExpenseInput => ({
      amount: candidate.cents,
      categoryId: choice.categoryId,
      subcategoryId: choice.subcategoryId,
      tagIds: [],
      date: candidate.date,
      note: group.label,
      externalRef: candidate.ref,
    }));
  });
}

/** Les règles à retenir : seulement celles où l'utilisateur a changé la proposition (ou tranché un inconnu). */
export function rulesToLearn(plan: ImportPlan, choices: Choices, now: IsoInstant): MerchantRule[] {
  return plan.groups.flatMap((group) => {
    const choice = choices[group.key];
    if (!choice) return [];
    const chosen: Classification = choice.ignore
      ? { categoryId: null, subcategoryId: null, ignore: true, source: 'user' }
      : {
          categoryId: choice.categoryId,
          subcategoryId: choice.subcategoryId,
          ignore: false,
          source: 'user',
        };
    if (group.suggestion.source !== 'unknown' && sameClassification(chosen, group.suggestion))
      return [];
    // Une opération ambiguë laissée sur « ne pas importer » n'est pas une décision : on ne la retient pas.
    if (group.suggestion.source === 'unknown' && group.suggestion.ignore && chosen.ignore)
      return [];
    return [
      {
        id: group.key,
        categoryId: chosen.categoryId,
        subcategoryId: chosen.subcategoryId,
        ignore: chosen.ignore,
        updatedAt: now,
        deletedAt: null,
      },
    ];
  });
}
