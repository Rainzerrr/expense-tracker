import type { CategoryId, SubcategoryId, SubcategoryLookup, TagId } from '@/domains/categorization';
import type { Brand } from '@/shared/lib/brand';
import { isLocalDate } from '@/shared/lib/time';
import type { IsoInstant, LocalDate } from '@/shared/lib/time';
import type { Cents } from './money';

export type ExpenseId = Brand<string, 'ExpenseId'>;

export interface Expense {
  id: ExpenseId;
  /** Strictement positif. */
  amount: Cents;
  categoryId: CategoryId;
  /** Doit appartenir à `categoryId`. */
  subcategoryId: SubcategoryId | null;
  tagIds: TagId[];
  date: LocalDate;
  createdAt: IsoInstant;
  updatedAt: IsoInstant;
  /** Suppression logique : permet « Annuler ». */
  deletedAt: IsoInstant | null;
}

/** Ce que saisit l'utilisateur, avant validation. */
export interface ExpenseInput {
  amount: number;
  categoryId: CategoryId;
  subcategoryId: SubcategoryId | null;
  tagIds: TagId[];
  date: string;
}

export type ExpenseError = 'invalidAmount' | 'invalidDate' | 'subcategoryMismatch' | 'notFound';

export type ExpenseResult = { ok: true; expense: Expense } | { ok: false; error: ExpenseError };

type ValidatedFields = Pick<Expense, 'amount' | 'categoryId' | 'subcategoryId' | 'tagIds' | 'date'>;

function validate(
  input: ExpenseInput,
  isSubcategoryOf: SubcategoryLookup,
): { ok: true; fields: ValidatedFields } | { ok: false; error: ExpenseError } {
  if (!Number.isSafeInteger(input.amount) || input.amount <= 0) {
    return { ok: false, error: 'invalidAmount' };
  }
  if (!isLocalDate(input.date)) {
    return { ok: false, error: 'invalidDate' };
  }
  if (input.subcategoryId !== null && !isSubcategoryOf(input.subcategoryId, input.categoryId)) {
    return { ok: false, error: 'subcategoryMismatch' };
  }
  return {
    ok: true,
    fields: {
      amount: input.amount as Cents,
      categoryId: input.categoryId,
      subcategoryId: input.subcategoryId,
      tagIds: [...new Set(input.tagIds)],
      date: input.date,
    },
  };
}

export interface CreateExpenseContext {
  id: ExpenseId;
  now: IsoInstant;
  isSubcategoryOf: SubcategoryLookup;
}

/** Seul point de création d'une dépense : les invariants sont vérifiés ici. */
export function createExpense(input: ExpenseInput, context: CreateExpenseContext): ExpenseResult {
  const checked = validate(input, context.isSubcategoryOf);
  if (!checked.ok) return checked;
  return {
    ok: true,
    expense: {
      id: context.id,
      ...checked.fields,
      createdAt: context.now,
      updatedAt: context.now,
      deletedAt: null,
    },
  };
}

export interface ReviseExpenseContext {
  now: IsoInstant;
  isSubcategoryOf: SubcategoryLookup;
}

/** Modification : mêmes règles que la création, l'identité et la date de création sont conservées. */
export function reviseExpense(
  existing: Expense,
  input: ExpenseInput,
  context: ReviseExpenseContext,
): ExpenseResult {
  const checked = validate(input, context.isSubcategoryOf);
  if (!checked.ok) return checked;
  return { ok: true, expense: { ...existing, ...checked.fields, updatedAt: context.now } };
}
