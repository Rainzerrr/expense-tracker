import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { buildDefaultCatalog } from '@/domains/categorization';
import type { CategoryId, SubcategoryId } from '@/domains/categorization';
import { DEFAULT_STAY } from '@/domains/stay';
import type { IsoInstant } from '@/shared/lib/time';
import {
  buildExpenseInputs,
  initialChoices,
  planStatementImport,
  rulesToLearn,
  summarizeChoices,
  unresolvedCount,
} from './importPlan';
import type { PlanInput } from './importPlan';
import { merchantKey } from './merchantRules';
import type { MerchantRule } from './merchantRules';
import { parseRevolutStatement } from './revolutStatement';

const HEADER = 'Type,Produit,Date de début,Date de fin,Description,Montant,Frais,Devise,État,Solde';
const line = (
  type: string,
  started: string,
  description: string,
  amount: string,
  state = 'TERMINÉ',
  currency = 'EUR',
  fee = '0.00',
) =>
  `${type},Valeur actuelle,${started},${state === 'EN ATTENTE' ? '' : started},${description},${amount},${fee},${currency},${state},10.00`;
const CARD = 'Paiement par carte';

function plan(lines: string[], overrides: Partial<PlanInput> = {}) {
  const parsed = parseRevolutStatement([HEADER, ...lines].join('\n'));
  if (!parsed.ok) throw new Error('relevé illisible');
  return planStatementImport({
    rows: parsed.rows,
    unreadableRows: parsed.unreadableRows,
    existingRefs: new Set(),
    stay: DEFAULT_STAY,
    rules: [],
    catalog: buildDefaultCatalog(),
    ...overrides,
  });
}

describe('planStatementImport : ce qui est importé ou ignoré', () => {
  const statement = [
    line(CARD, '2026-09-01 18:34:52', 'Primaprix', '-38.25'),
    line(CARD, '2026-09-02 09:00:00', 'Continente', '-20.00'),
    line(CARD, '2026-09-03 09:00:00', 'Continente', '-12.50'),
    line(CARD, '2026-09-04 09:00:00', 'Nobby', '-21.00'),
    line('Ajout de fonds', '2026-09-01 18:33:36', 'Recharge sur Apple Pay via *5583', '200.00'),
    line(CARD, '2026-09-21 19:33:52', 'Gelato', '-4.50', 'EN ATTENTE'),
    line(CARD, '2026-08-29 17:33:22', 'Amazon', '-40.46'),
    line(CARD, '2026-09-10 12:00:00', 'Shop UK', '-9.00', 'TERMINÉ', 'GBP'),
    line(CARD, '2026-09-11 12:00:00', 'Boutique', '-5.00', 'ANNULÉ'),
    line('Remboursement', '2026-09-12 12:00:00', 'Amazon', '15.00'),
    line('Change', '2026-09-13 12:00:00', 'Échange en EUR', '-30.00'),
  ];
  const result = plan(statement);

  it('regroupe les achats par commerçant, avec leur total', () => {
    const continente = result.groups.find((g) => g.label === 'Continente');
    expect(continente).toMatchObject({ total: 3250 });
    expect(continente?.candidates).toHaveLength(2);
    expect(result.candidateCount).toBe(4);
    expect(result.total).toBe(3825 + 3250 + 2100);
  });

  it('explique chaque opération ignorée', () => {
    expect(result.skipped).toEqual({
      pending: 1, // Gelato : on l'importera avec le prochain relevé, une fois terminée
      notCompleted: 1,
      foreignCurrency: 1,
      topUp: 1,
      incoming: 1,
      otherType: 1,
      outsideStay: 1, // Amazon du 29 août, avant le début du séjour
      alreadyImported: 0,
    });
    expect(result.ignoredTypes).toEqual({ Change: 1 });
  });

  it('classe les enseignes connues et laisse les autres « à classer », en tête de liste', () => {
    expect(result.groups.map((g) => [g.label, g.suggestion.source])).toEqual([
      ['Nobby', 'unknown'],
      ['Primaprix', 'default'],
      ['Continente', 'default'],
    ]);
    expect(result.groups[0]?.needsReview).toBe(true);
    expect(result.groups[1]?.suggestion).toMatchObject({
      categoryId: 'groceries',
      subcategoryId: 'groceries.staples',
    });
  });

  it('range par ordre de total à l’intérieur de chaque famille', () => {
    expect(result.groups.slice(1).map((g) => g.label)).toEqual(['Primaprix', 'Continente']);
  });
});

describe('planStatementImport : détails', () => {
  it('utilise le jour de l’achat, pas celui du règlement', () => {
    const late =
      'Paiement par carte,Valeur actuelle,2026-08-31 17:47:13,2026-09-01 10:20:22,Pingpang,-26.00,0.00,EUR,TERMINÉ,1';
    expect(plan([late]).skipped.outsideStay).toBe(1); // acheté le 31 août : hors séjour
  });

  it('borne le séjour : le 1er septembre et le 31 janvier sont inclus', () => {
    const inside = plan([
      line(CARD, '2026-09-01 00:00:01', 'Lidl', '-1.00'),
      line(CARD, '2027-01-31 23:59:59', 'Lidl', '-1.00'),
    ]);
    expect(inside.candidateCount).toBe(2);
    expect(plan([line(CARD, '2027-02-01 00:00:00', 'Lidl', '-1.00')]).skipped.outsideStay).toBe(1);
  });

  it('ajoute les frais au coût', () => {
    const withFee = plan([
      line(CARD, '2026-09-05 12:00:00', 'Lidl', '-20.00', 'TERMINÉ', 'EUR', '0.50'),
    ]);
    expect(withFee.total).toBe(2050);
  });

  it('ne compte pas une opération déjà importée, même si le relevé chevauche le précédent', () => {
    const first = plan([
      line(CARD, '2026-09-05 12:00:00', 'Lidl', '-3.00'),
      line(CARD, '2026-09-06 12:00:00', 'Lidl', '-4.00'),
    ]);
    const refs = new Set(first.groups.flatMap((g) => g.candidates.map((c) => c.ref)));
    const again = plan(
      [
        line(CARD, '2026-09-05 12:00:00', 'Lidl', '-3.00'),
        line(CARD, '2026-09-06 12:00:00', 'Lidl', '-4.00'),
        line(CARD, '2026-09-07 12:00:00', 'Lidl', '-5.00'),
      ],
      { existingRefs: refs },
    );
    expect(again.skipped.alreadyImported).toBe(2);
    expect(again.candidateCount).toBe(1);
  });

  it('distingue deux opérations identiques à la même seconde', () => {
    const twin = plan([
      line(CARD, '2026-09-05 12:00:00', 'Lidl', '-3.00'),
      line(CARD, '2026-09-05 12:00:00', 'Lidl', '-3.00'),
    ]);
    const refs = twin.groups.flatMap((g) => g.candidates.map((c) => c.ref));
    expect(new Set(refs).size).toBe(2);
    // Et un second import du même fichier les reconnaît toutes les deux.
    const again = plan(
      [
        line(CARD, '2026-09-05 12:00:00', 'Lidl', '-3.00'),
        line(CARD, '2026-09-05 12:00:00', 'Lidl', '-3.00'),
      ],
      { existingRefs: new Set(refs) },
    );
    expect(again.candidateCount).toBe(0);
  });

  it('un virement ou un retrait n’est pas importé tant que l’utilisateur ne l’a pas décidé', () => {
    const result = plan([line('Virement', '2026-09-03 10:00:00', 'Loyer Lisboa', '-420.00')]);
    expect(result.groups[0]).toMatchObject({ needsReview: true, suggestion: { ignore: true } });
    expect(initialChoices(result)).toEqual({ [merchantKey('Loyer Lisboa')]: { ignore: true } });
  });

  it('retombe sur « à classer » quand une règle apprise vise une catégorie qui n’existe plus', () => {
    const stale: MerchantRule = {
      id: merchantKey('Nobby'),
      categoryId: 'disparue' as CategoryId,
      subcategoryId: null,
      ignore: false,
      updatedAt: '2026-09-01T00:00:00.000Z' as IsoInstant,
      deletedAt: null,
    };
    const result = plan([line(CARD, '2026-09-04 09:00:00', 'Nobby', '-21.00')], { rules: [stale] });
    expect(result.groups[0]?.suggestion.source).toBe('unknown');
  });
});

describe('choix, dépenses créées et règles apprises', () => {
  const result = plan([
    line(CARD, '2026-09-02 09:00:00', 'Continente', '-20.00'),
    line(CARD, '2026-09-04 09:00:00', 'Nobby', '-21.00'),
    line(CARD, '2026-09-05 09:00:00', 'Amazon', '-10.00'),
  ]);
  const nobby = merchantKey('Nobby');
  const continente = merchantKey('Continente');
  const amazon = merchantKey('Amazon');

  it('un commerçant inconnu bloque l’import jusqu’à ce qu’il soit classé', () => {
    const choices = initialChoices(result);
    expect(unresolvedCount(result, choices)).toBe(1);
    const resolved = {
      ...choices,
      [nobby]: {
        ignore: false as const,
        categoryId: 'shopping' as CategoryId,
        subcategoryId: null,
      },
    };
    expect(unresolvedCount(result, resolved)).toBe(0);
  });

  it('crée une dépense par opération, avec le commerçant en note et la référence d’origine', () => {
    const choices = {
      ...initialChoices(result),
      [nobby]: {
        ignore: false as const,
        categoryId: 'shopping' as CategoryId,
        subcategoryId: 'shopping.other' as SubcategoryId,
      },
    };
    const inputs = buildExpenseInputs(result, choices);
    expect(inputs).toHaveLength(3);
    expect(inputs.find((i) => i.note === 'Nobby')).toMatchObject({
      amount: 2100,
      categoryId: 'shopping',
      subcategoryId: 'shopping.other',
      date: '2026-09-04',
    });
    expect(inputs.every((i) => i.externalRef?.startsWith('revolut:'))).toBe(true);
  });

  it('n’importe pas un commerçant mis sur « ne pas importer »', () => {
    const choices = { ...initialChoices(result), [nobby]: { ignore: true as const } };
    expect(buildExpenseInputs(result, choices).map((i) => i.note)).toEqual([
      'Continente',
      'Amazon',
    ]);
    expect(summarizeChoices(result, choices)).toEqual({ count: 2, total: 3000 });
  });

  it('retient une règle pour un commerçant inconnu qu’on vient de classer', () => {
    const choices = {
      ...initialChoices(result),
      [nobby]: {
        ignore: false as const,
        categoryId: 'shopping' as CategoryId,
        subcategoryId: null,
      },
    };
    const learned = rulesToLearn(result, choices, '2026-09-22T10:00:00.000Z' as IsoInstant);
    expect(learned).toEqual([
      {
        id: nobby,
        categoryId: 'shopping',
        subcategoryId: null,
        ignore: false,
        updatedAt: '2026-09-22T10:00:00.000Z',
        deletedAt: null,
      },
    ]);
  });

  it('retient une règle quand on corrige une proposition livrée', () => {
    const choices = {
      ...initialChoices(result),
      [nobby]: { ignore: true as const },
      [amazon]: {
        ignore: false as const,
        categoryId: 'groceries' as CategoryId,
        subcategoryId: 'groceries.hygiene' as SubcategoryId,
      },
    };
    const learned = rulesToLearn(result, choices, '2026-09-22T10:00:00.000Z' as IsoInstant);
    expect(learned.map((r) => r.id).sort()).toEqual([amazon, nobby].sort());
  });

  it('ne retient rien pour une proposition acceptée telle quelle', () => {
    const choices = {
      ...initialChoices(result),
      [nobby]: {
        ignore: false as const,
        categoryId: 'shopping' as CategoryId,
        subcategoryId: null,
      },
    };
    const learned = rulesToLearn(result, choices, '2026-09-22T10:00:00.000Z' as IsoInstant);
    expect(learned.some((r) => r.id === continente)).toBe(false);
  });
});

// Ton vrai relevé, s'il est présent à la racine : on vérifie que le format réel est bien lu.
// Il est exclu de git ; ce test ne s'exécute qu'en local et n'affiche aucune donnée.
const root = process.cwd();
const realFile = readdirSync(root).find((name) => /^account-statement_.*\.csv$/.test(name));
describe.skipIf(!realFile)('relevé Revolut réel (local)', () => {
  const text = realFile ? readFileSync(join(root, realFile), 'utf8') : '';

  it('est lu sans aucune ligne illisible', () => {
    const parsed = parseRevolutStatement(text);
    expect(parsed.ok && parsed.unreadableRows).toBe(0);
    expect(parsed.ok && parsed.rows.length).toBeGreaterThan(10);
  });

  it('donne un plan cohérent : les recharges et l’en-attente sont ignorées, tout le reste est classé ou à classer', () => {
    const parsed = parseRevolutStatement(text);
    if (!parsed.ok) throw new Error('relevé illisible');
    const result = planStatementImport({
      rows: parsed.rows,
      unreadableRows: 0,
      existingRefs: new Set(),
      stay: DEFAULT_STAY,
      rules: [],
      catalog: buildDefaultCatalog(),
    });
    expect(result.skipped.topUp).toBeGreaterThan(0);
    // Chaque opération est soit importable, soit ignorée pour une raison : rien ne disparaît.
    const skipped = Object.values(result.skipped).reduce((a, b) => a + b, 0);
    expect(result.candidateCount + skipped).toBe(parsed.rows.length);
    expect(result.groups.every((g) => g.total > 0)).toBe(true);
  });
});
