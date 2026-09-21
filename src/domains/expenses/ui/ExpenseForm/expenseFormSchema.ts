import { z } from 'zod';
import type { CategoryId, SubcategoryId, TagId } from '@/domains/categorization';
import { isLocalDate } from '@/shared/lib/time';
import { formatAmountInput } from '../../domain/amountInput';
import type { Expense, ExpenseInput } from '../../domain/expense';
import { parseEuroInput } from '../../domain/money';

/** Clés de traduction (namespace `expenses`) : le schéma ne contient aucun texte en dur. */
export const ERROR_KEYS = {
  amount: 'form.errors.amount',
  category: 'form.errors.category',
  date: 'form.errors.date',
} as const;
export type FormErrorKey = (typeof ERROR_KEYS)[keyof typeof ERROR_KEYS];

// « 12, » (virgule laissée en fin de saisie) vaut 12.
const parseAmount = (input: string) => parseEuroInput(input.replace(/,$/, ''));

export const expenseFormSchema = z.object({
  amount: z
    .string()
    .refine((value) => (parseAmount(value) ?? 0) > 0, { message: ERROR_KEYS.amount }),
  categoryId: z.string().min(1, { message: ERROR_KEYS.category }),
  subcategoryId: z.string().nullable(),
  // Retour `boolean` explicite : sans lui, TypeScript infère un type-guard et le type nominal fuit dans le schéma.
  date: z.string().refine((value): boolean => isLocalDate(value), { message: ERROR_KEYS.date }),
  tagIds: z.array(z.string()),
});

export type ExpenseFormValues = z.infer<typeof expenseFormSchema>;

/** Les valeurs du formulaire (texte) deviennent la saisie du domaine (centimes). */
export function toExpenseInput(values: ExpenseFormValues): ExpenseInput {
  return {
    amount: parseAmount(values.amount) ?? 0,
    categoryId: values.categoryId as CategoryId,
    subcategoryId: values.subcategoryId as SubcategoryId | null,
    tagIds: values.tagIds as TagId[],
    date: values.date,
  };
}

/** Préremplit le formulaire de modification. */
export function expenseToFormValues(expense: Expense): ExpenseFormValues {
  return {
    amount: formatAmountInput(expense.amount),
    categoryId: expense.categoryId,
    subcategoryId: expense.subcategoryId,
    date: expense.date,
    tagIds: expense.tagIds,
  };
}
