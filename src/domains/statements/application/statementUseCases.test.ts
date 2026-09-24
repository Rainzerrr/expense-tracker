import { deleteExpense } from '@/domains/expenses';
import { DEFAULT_STAY } from '@/domains/stay';
import { createTestServices } from '@/test/services';
import type { AppServices } from '@/app/bootstrap';
import { initialChoices } from '../domain/importPlan';
import type { Choices, ImportPlan } from '../domain/importPlan';
import { merchantKey } from '../domain/merchantRules';
import { importStatement, previewStatement } from './statementUseCases';

const HEADER = 'Type,Produit,Date de début,Date de fin,Description,Montant,Frais,Devise,État,Solde';
const card = (started: string, description: string, amount: string, state = 'TERMINÉ') =>
  `Paiement par carte,Valeur actuelle,${started},${state === 'EN ATTENTE' ? '' : started},${description},${amount},0.00,EUR,${state},10.00`;
const statement = (...lines: string[]) => [HEADER, ...lines].join('\n');
const D = (day: string) => new Date(`2026-09-${day}T12:00:00Z`);

let app: AppServices;
beforeEach(async () => {
  app = await createTestServices();
});

async function preview(text: string): Promise<ImportPlan> {
  const result = await previewStatement(app, text, DEFAULT_STAY);
  if (!result.ok) throw new Error(`relevé refusé : ${result.error}`);
  return result.plan;
}
const classify = (plan: ImportPlan, extra: Record<string, Choices[string]> = {}): Choices => ({
  ...initialChoices(plan),
  ...extra,
});
const shopping = { ignore: false as const, categoryId: 'shopping' as never, subcategoryId: null };
const all = () => app.expenses.findBetween('2026-09-01' as never, '2026-09-30' as never);

describe('previewStatement', () => {
  it('ne modifie rien', async () => {
    await preview(statement(card('2026-09-05 12:00:00', 'Continente', '-20.00')));
    expect(await app.expenses.isEmpty()).toBe(true);
    expect(await app.merchantRules.list()).toEqual([]);
  });

  it('refuse un fichier qui n’est pas un relevé', async () => {
    expect(await previewStatement(app, 'a;b\n1;2', DEFAULT_STAY)).toEqual({
      ok: false,
      error: 'notAStatement',
    });
    expect(await previewStatement(app, '', DEFAULT_STAY)).toEqual({ ok: false, error: 'empty' });
  });
});

describe('importStatement', () => {
  const march = statement(
    card('2026-09-05 12:00:00', 'Continente', '-20.00'),
    card('2026-09-06 12:00:00', 'Nobby', '-21.00'),
  );

  it('crée les dépenses avec le commerçant en note, la catégorie choisie et la référence d’origine', async () => {
    const plan = await preview(march);
    const result = await importStatement(
      app,
      plan,
      classify(plan, { [merchantKey('Nobby')]: shopping }),
      D('22'),
    );
    expect(result).toMatchObject({ imported: 2, total: 4100, skipped: 0 });

    const expenses = await all();
    expect(expenses.map((e) => [e.note, e.amount, e.categoryId, e.subcategoryId, e.date])).toEqual([
      ['Nobby', 2100, 'shopping', null, '2026-09-06'],
      ['Continente', 2000, 'groceries', 'groceries.staples', '2026-09-05'],
    ]);
    expect(expenses.every((e) => e.externalRef?.startsWith('revolut:'))).toBe(true);
  });

  it('un second import du même relevé n’ajoute rien', async () => {
    const first = await preview(march);
    await importStatement(app, first, classify(first, { [merchantKey('Nobby')]: shopping }));

    const again = await preview(march);
    expect(again.candidateCount).toBe(0);
    expect(again.skipped.alreadyImported).toBe(2);
    expect(await all()).toHaveLength(2);
  });

  it('un relevé qui chevauche le précédent n’importe que ce qui est nouveau', async () => {
    const first = await preview(
      statement(
        card('2026-09-05 12:00:00', 'Continente', '-20.00'),
        card('2026-09-06 12:00:00', 'Lidl', '-5.00'),
      ),
    );
    await importStatement(app, first, classify(first));

    const second = await preview(
      statement(
        card('2026-09-06 12:00:00', 'Lidl', '-5.00'),
        card('2026-09-07 12:00:00', 'Lidl', '-6.00'),
        card('2026-09-08 12:00:00', 'Auchan', '-7.00'),
      ),
    );
    expect(second.skipped.alreadyImported).toBe(1);
    expect(second.candidateCount).toBe(2);
    await importStatement(app, second, classify(second));
    expect(await all()).toHaveLength(4);
  });

  it('ne ressuscite pas une dépense supprimée par l’utilisateur', async () => {
    const first = await preview(statement(card('2026-09-05 12:00:00', 'Continente', '-20.00')));
    await importStatement(app, first, classify(first));
    const [imported] = await all();
    await deleteExpense(app.expenses, imported!.id);

    const again = await preview(statement(card('2026-09-05 12:00:00', 'Continente', '-20.00')));
    expect(again.skipped.alreadyImported).toBe(1);
    expect(again.candidateCount).toBe(0);
  });

  it('ne double pas non plus si le même aperçu est confirmé deux fois', async () => {
    const plan = await preview(statement(card('2026-09-05 12:00:00', 'Continente', '-20.00')));
    const choices = classify(plan);
    await importStatement(app, plan, choices);
    const second = await importStatement(app, plan, choices);
    expect(second).toMatchObject({ imported: 0, skipped: 1 });
    expect(await all()).toHaveLength(1);
  });

  it('retient le choix de l’utilisateur : le commerçant est classé tout seul la fois suivante', async () => {
    const first = await preview(statement(card('2026-09-06 12:00:00', 'Nobby', '-21.00')));
    expect(first.groups[0]?.suggestion.source).toBe('unknown');
    const result = await importStatement(
      app,
      first,
      classify(first, { [merchantKey('Nobby')]: shopping }),
    );
    expect(result.learnedRules).toBe(1);

    const next = await preview(statement(card('2026-09-09 12:00:00', 'NOBBY', '-8.00')));
    expect(next.groups[0]?.suggestion).toMatchObject({ source: 'user', categoryId: 'shopping' });
    expect(next.groups[0]?.needsReview).toBe(false);
  });

  it('retient aussi une correction d’une règle livrée', async () => {
    const first = await preview(statement(card('2026-09-06 12:00:00', 'Amazon', '-30.00')));
    expect(first.groups[0]?.suggestion.source).toBe('default');
    await importStatement(
      app,
      first,
      classify(first, {
        [merchantKey('Amazon')]: {
          ignore: false,
          categoryId: 'housing' as never,
          subcategoryId: 'housing.homeEquipment' as never,
        },
      }),
    );

    const next = await preview(statement(card('2026-09-10 12:00:00', 'Amazon', '-12.00')));
    expect(next.groups[0]?.suggestion).toMatchObject({
      source: 'user',
      subcategoryId: 'housing.homeEquipment',
    });
  });

  it('ne retient pas une règle quand la proposition livrée est acceptée telle quelle', async () => {
    const plan = await preview(statement(card('2026-09-05 12:00:00', 'Continente', '-20.00')));
    const result = await importStatement(app, plan, classify(plan));
    expect(result.learnedRules).toBe(0);
    expect(await app.merchantRules.list()).toEqual([]);
  });

  it('« ne pas importer » est retenu : le commerçant est ignoré la fois suivante', async () => {
    const first = await preview(statement(card('2026-09-06 12:00:00', 'Nobby', '-21.00')));
    const result = await importStatement(
      app,
      first,
      classify(first, { [merchantKey('Nobby')]: { ignore: true } }),
    );
    expect(result).toMatchObject({ imported: 0, learnedRules: 1 });
    expect(await app.expenses.isEmpty()).toBe(true);

    const next = await preview(statement(card('2026-09-09 12:00:00', 'Nobby', '-8.00')));
    expect(next.groups[0]).toMatchObject({
      needsReview: false,
      suggestion: { ignore: true, source: 'user' },
    });
  });

  it('une opération en attente n’est pas importée, puis l’est une fois terminée', async () => {
    const pending = await preview(
      statement(card('2026-09-21 19:33:52', 'Gelato', '-4.50', 'EN ATTENTE')),
    );
    expect(pending.skipped.pending).toBe(1);
    expect(pending.candidateCount).toBe(0);

    const done = await preview(statement(card('2026-09-21 19:33:52', 'Gelato', '-4.50')));
    expect(done.candidateCount).toBe(1);
  });

  it('les dépenses importées se retrouvent par leur commerçant (note)', async () => {
    const plan = await preview(statement(card('2026-09-05 12:00:00', 'Continente', '-20.00')));
    await importStatement(app, plan, classify(plan));
    const [expense] = await all();
    expect(expense?.note).toBe('Continente');
  });
});
