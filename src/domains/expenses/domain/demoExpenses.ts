import { buildDefaultCatalog, createSubcategoryLookup } from '@/domains/categorization';
import type { CategoryId, SubcategoryId, TagId } from '@/domains/categorization';
import { addMonths, monthOf, monthStart } from '@/shared/lib/time';
import type { IsoInstant, LocalDate, YearMonth } from '@/shared/lib/time';
import { createExpense } from './expense';
import type { Expense, ExpenseId } from './expense';

// [jour du mois, « catégorie.sous-catégorie », centimes, tag éventuel]
type DemoLine = readonly [day: number, subcategory: string, cents: number, tag?: string];

// Un même jour, la ligne la plus basse est la plus récente : elle s'affiche en premier (comme la maquette).
// Du 1er au 20 : 970 € au total dont 420 € de loyer, comme dans les maquettes
// (moyenne de 27,50 € par jour hors logement, projection de 1 245 € en fin de septembre).
const DEMO_LINES: readonly DemoLine[] = [
  [1, 'housing.rent', 42000],
  [1, 'groceries.staples', 3250],
  [1, 'transport.navegante', 4000],
  [2, 'groceries.meat', 1310],
  [2, 'groceries.fruitsVegetables', 780],
  [3, 'activities.cafes', 290],
  [3, 'activities.restaurants', 1250],
  [4, 'groceries.bakery', 380],
  [4, 'subscriptions.phone', 1500],
  [5, 'activities.esnEvents', 2500],
  [5, 'groceries.drinks', 920],
  [6, 'groceries.dairyEggs', 720],
  [6, 'misc.admin', 2000],
  [7, 'activities.bars', 2200, 'soirée-esn'],
  [7, 'transport.rideshare', 890],
  [8, 'groceries.staples', 2860],
  [8, 'groceries.fish', 1280],
  [9, 'activities.culture', 1500],
  [9, 'activities.cafes', 310],
  [10, 'shopping.clothes', 3900],
  [10, 'groceries.snacks', 450, 'petit-plaisir'],
  [11, 'health.pharmacy', 1240],
  [11, 'activities.restaurants', 1580, 'avec-amis'],
  [12, 'groceries.hygiene', 1350],
  [12, 'groceries.meat', 1450],
  [12, 'groceries.fruitsVegetables', 1570],
  [12, 'transport.rideshare', 1180],
  [13, 'groceries.meat', 1520],
  [13, 'travel.lodging', 5500],
  [16, 'groceries.meat', 860],
  [17, 'groceries.fruitsVegetables', 930],
  [18, 'groceries.bakery', 420],
  [18, 'activities.bars', 1400, 'soirée-esn'],
  [19, 'transport.rideshare', 620],
  [19, 'activities.restaurants', 1850, 'avec-amis'],
  [20, 'groceries.meat', 1240],
  // Fin de mois (jusqu'au 28, présent dans tous les mois).
  [21, 'groceries.meat', 1380],
  [21, 'activities.cafes', 260],
  [22, 'groceries.staples', 3120],
  [23, 'activities.restaurants', 1690, 'avec-amis'],
  [24, 'transport.train', 1450],
  [25, 'activities.bars', 1900, 'soirée-esn'],
  [25, 'groceries.bakery', 350],
  [26, 'groceries.fruitsVegetables', 910],
  [27, 'activities.excursions', 3500],
  [28, 'groceries.meat', 1490],
  [28, 'subscriptions.streaming', 1199],
];

const STAY_FIRST_MONTH = '2026-09' as YearMonth;

/**
 * Jeu de données fictif pour le mode démo : le mois de `today` jusqu'à aujourd'hui,
 * et le mois précédent en entier s'il fait partie du séjour.
 */
export function buildDemoExpenses(
  today: LocalDate,
  now: IsoInstant,
  newId: () => string,
): Expense[] {
  const isSubcategoryOf = createSubcategoryLookup(buildDefaultCatalog().subcategories);
  const currentMonth = monthOf(today);
  const todayDay = Number(today.slice(8, 10));
  const previousMonth = addMonths(currentMonth, -1);

  const months: { month: YearMonth; lastDay: number }[] = [];
  if (previousMonth >= STAY_FIRST_MONTH) months.push({ month: previousMonth, lastDay: 28 });
  months.push({ month: currentMonth, lastDay: todayDay });

  return months.flatMap(({ month, lastDay }) =>
    DEMO_LINES.filter(([day]) => day <= lastDay).map(([day, path, cents, tag]) => {
      const categoryKey = path.split('.')[0] ?? '';
      const result = createExpense(
        {
          amount: cents,
          categoryId: categoryKey as CategoryId,
          subcategoryId: path as SubcategoryId,
          tagIds: tag ? [tag as TagId] : [],
          date: `${monthStart(month).slice(0, 8)}${String(day).padStart(2, '0')}`,
        },
        { id: newId() as ExpenseId, now, isSubcategoryOf },
      );
      if (!result.ok) throw new Error(`Donnée de démo invalide (${path}) : ${result.error}`);
      return result.expense;
    }),
  );
}
