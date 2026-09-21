import { FIXED_CATEGORY_IDS } from '@/domains/categorization';
import type { IsoInstant, LocalDate } from '@/shared/lib/time';
import { buildDemoExpenses } from './demoExpenses';

const now = '2026-09-20T10:00:00.000Z' as IsoInstant;
let counter = 0;
const newId = () => `demo-${counter++}`;
const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);

describe('buildDemoExpenses', () => {
  it('reproduit les maquettes au 20 septembre : 970 € dont 420 € de loyer', () => {
    const expenses = buildDemoExpenses('2026-09-20' as LocalDate, now, newId);
    const total = sum(expenses.map((e) => e.amount));
    const rent = sum(
      expenses.filter((e) => FIXED_CATEGORY_IDS.includes(e.categoryId)).map((e) => e.amount),
    );
    expect(total).toBe(97000);
    expect(rent).toBe(42000);
  });

  it("ne génère rien après aujourd'hui", () => {
    const expenses = buildDemoExpenses('2026-09-10' as LocalDate, now, newId);
    expect(expenses.every((e) => e.date <= '2026-09-10')).toBe(true);
  });

  it('ajoute le mois précédent en entier quand il fait partie du séjour', () => {
    const expenses = buildDemoExpenses('2026-10-05' as LocalDate, now, newId);
    expect(expenses.some((e) => e.date.startsWith('2026-09-28'))).toBe(true);
    expect(expenses.some((e) => e.date.startsWith('2026-10') && e.date > '2026-10-05')).toBe(false);
  });

  it('ne remonte pas avant le début du séjour', () => {
    const expenses = buildDemoExpenses('2026-09-20' as LocalDate, now, newId);
    expect(expenses.every((e) => e.date.startsWith('2026-09'))).toBe(true);
  });

  it('donne des identifiants uniques', () => {
    const expenses = buildDemoExpenses('2026-10-20' as LocalDate, now, newId);
    expect(new Set(expenses.map((e) => e.id)).size).toBe(expenses.length);
  });
});
