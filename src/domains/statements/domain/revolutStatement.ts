import { normalizeSearchText } from '@/domains/expenses';
import { isLocalDate } from '@/shared/lib/time';
import type { LocalDate } from '@/shared/lib/time';
import { parseCsv } from './csvParser';

export type OperationState = 'completed' | 'pending' | 'other';

export interface StatementRow {
  /** Type d'opération tel qu'écrit par la banque : « Paiement par carte », « Ajout de fonds »… */
  type: string;
  /** Début de l'opération, tel que dans le fichier : « 2026-09-01 18:34:52 ». */
  startedAt: string;
  /** Le jour où l'opération a commencé (l'achat), pas celui du règlement. */
  date: LocalDate;
  /** Le commerçant, tel que la banque l'écrit. */
  description: string;
  /** Signé : un achat est négatif. */
  amountCents: number;
  /** Frais éventuels, en valeur absolue. */
  feeCents: number;
  currency: string;
  state: OperationState;
}

export type ParseStatementError = 'empty' | 'notAStatement';
export type ParseStatementResult =
  | { ok: true; rows: StatementRow[]; unreadableRows: number }
  | { ok: false; error: ParseStatementError };

// Noms de colonnes reconnus (français et anglais), comparés sans accents ni casse.
const COLUMNS = {
  type: ['type'],
  startedAt: ['date de debut', 'started date'],
  description: ['description'],
  amount: ['montant', 'amount'],
  fee: ['frais', 'fee'],
  currency: ['devise', 'currency'],
  state: ['etat', 'state'],
} as const;
const REQUIRED = ['type', 'startedAt', 'description', 'amount', 'currency', 'state'] as const;

const COMPLETED = ['termine', 'completed'];
const PENDING = ['en attente', 'pending'];

/** « 12.40 », « 12,40 », « 1,234.56 », « -40.46 » → centimes signés. NaN si illisible. */
export function parseAmountCents(raw: string): number {
  const cleaned = raw.replace(/\s/g, '');
  // Format strict : des milliers par groupes de 3 chiffres, au plus 2 décimales. Une ligne douteuse est refusée, pas devinée.
  if (!/^[+-]?(\d{1,3}([.,]\d{3})+|\d+)([.,]\d{1,2})?$/.test(cleaned)) return Number.NaN;
  const lastDot = cleaned.lastIndexOf('.');
  const lastComma = cleaned.lastIndexOf(',');
  // Le dernier séparateur est la décimale ; l'autre, s'il existe, sépare les milliers.
  const decimalAt = Math.max(lastDot, lastComma);
  const normalized =
    decimalAt === -1
      ? cleaned
      : `${cleaned.slice(0, decimalAt).replace(/[.,]/g, '')}.${cleaned.slice(decimalAt + 1)}`;
  const value = Number(normalized);
  return Number.isFinite(value) ? Math.round(value * 100) : Number.NaN;
}

function toState(raw: string): OperationState {
  const normalized = normalizeSearchText(raw);
  if (COMPLETED.includes(normalized)) return 'completed';
  if (PENDING.includes(normalized)) return 'pending';
  return 'other';
}

/**
 * Lit un relevé de compte Revolut exporté en CSV (colonnes françaises ou anglaises).
 * Une ligne illisible est comptée, pas fatale : le reste du fichier reste importable.
 */
export function parseRevolutStatement(text: string): ParseStatementResult {
  const table = parseCsv(text);
  const [header, ...body] = table;
  if (!header) return { ok: false, error: 'empty' };

  const names = header.map((cell) => normalizeSearchText(cell));
  const indexOf = (key: keyof typeof COLUMNS) =>
    names.findIndex((name) => (COLUMNS[key] as readonly string[]).includes(name));
  const index = Object.fromEntries(
    (Object.keys(COLUMNS) as (keyof typeof COLUMNS)[]).map((k) => [k, indexOf(k)]),
  ) as Record<keyof typeof COLUMNS, number>;
  if (REQUIRED.some((key) => index[key] === -1)) return { ok: false, error: 'notAStatement' };

  const rows: StatementRow[] = [];
  let unreadableRows = 0;
  for (const cells of body) {
    const cell = (key: keyof typeof COLUMNS) => (cells[index[key]] ?? '').trim();
    const startedAt = cell('startedAt');
    const date = startedAt.slice(0, 10);
    const amountCents = parseAmountCents(cell('amount'));
    const feeCents = index.fee === -1 || cell('fee') === '' ? 0 : parseAmountCents(cell('fee'));

    if (
      !isLocalDate(date) ||
      Number.isNaN(amountCents) ||
      Number.isNaN(feeCents) ||
      !cell('description')
    ) {
      unreadableRows += 1;
      continue;
    }
    rows.push({
      type: cell('type'),
      startedAt,
      date,
      description: cell('description'),
      amountCents,
      feeCents: Math.abs(feeCents),
      currency: cell('currency').toUpperCase(),
      state: toState(cell('state')),
    });
  }
  return { ok: true, rows, unreadableRows };
}
