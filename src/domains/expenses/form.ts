// Point d'entrée du formulaire de saisie. Lourd (React Hook Form, Zod) : à importer uniquement
// depuis un écran chargé à la demande.
export { ExpenseForm, expenseToFormValues, toExpenseInput } from './ui/ExpenseForm';
export type { ExpenseFormProps, ExpenseFormValues } from './ui/ExpenseForm';
