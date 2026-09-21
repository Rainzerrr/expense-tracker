import type { Expense } from '../../domain/expense';
import { expenseFormSchema, expenseToFormValues, toExpenseInput } from './expenseFormSchema';
import type { ExpenseFormValues } from './expenseFormSchema';

const valid: ExpenseFormValues = {
  amount: '12,40',
  categoryId: 'groceries',
  subcategoryId: 'groceries.meat',
  date: '2026-09-20',
  tagIds: [],
};

const errorOf = (values: ExpenseFormValues, field: string) => {
  const result = expenseFormSchema.safeParse(values);
  return result.success ? null : result.error.issues.find((i) => i.path[0] === field)?.message;
};

describe('expenseFormSchema', () => {
  it('accepte une saisie complète', () => {
    expect(expenseFormSchema.safeParse(valid).success).toBe(true);
  });

  it.each(['', '0', '0,00', 'abc'])('refuse le montant %j', (amount) => {
    expect(errorOf({ ...valid, amount }, 'amount')).toBe('form.errors.amount');
  });

  it('accepte une virgule laissée en fin de saisie', () => {
    expect(expenseFormSchema.safeParse({ ...valid, amount: '12,' }).success).toBe(true);
  });

  it('exige une catégorie', () => {
    expect(errorOf({ ...valid, categoryId: '' }, 'categoryId')).toBe('form.errors.category');
  });

  it('refuse une date inexistante', () => {
    expect(errorOf({ ...valid, date: '2026-02-30' }, 'date')).toBe('form.errors.date');
  });
});

describe('toExpenseInput', () => {
  it('convertit le montant en centimes', () => {
    expect(toExpenseInput(valid)).toMatchObject({ amount: 1240, date: '2026-09-20' });
    expect(toExpenseInput({ ...valid, amount: '12,' }).amount).toBe(1200);
  });
});

describe('expenseToFormValues', () => {
  it('préremplit le formulaire, montant en texte', () => {
    const expense = {
      amount: 1850,
      categoryId: 'activities',
      subcategoryId: 'activities.restaurants',
      date: '2026-09-19',
      tagIds: ['avec-amis'],
    } as unknown as Expense;
    expect(expenseToFormValues(expense)).toEqual({
      amount: '18,50',
      categoryId: 'activities',
      subcategoryId: 'activities.restaurants',
      date: '2026-09-19',
      tagIds: ['avec-amis'],
    });
  });

  it('est l’inverse de toExpenseInput', () => {
    const values = { ...valid, amount: '18,50' };
    const expense = { ...toExpenseInput(values) } as unknown as Expense;
    expect(expenseToFormValues(expense)).toEqual(values);
  });
});
