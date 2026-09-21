import type { Brand } from '@/shared/lib/brand';

/** Montant en centimes d'euro (entier). 1240 = 12,40 €. Jamais de nombre à virgule. */
export type Cents = Brand<number, 'Cents'>;

export function toCents(value: number): Cents {
  if (!Number.isSafeInteger(value)) {
    throw new RangeError(`Un montant en centimes doit être un entier : ${value}`);
  }
  return value as Cents;
}

export function sumCents(values: Iterable<number>): Cents {
  let total = 0;
  for (const value of values) total += value;
  return toCents(total);
}

/** « 12,40 » → 1240. Retourne null si la saisie est invalide. */
export function parseEuroInput(input: string): Cents | null {
  const normalized = input.trim().replace(/\s/g, '').replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  const [int = '', dec = ''] = normalized.split('.');
  const cents = Number(int) * 100 + Number(dec.padEnd(2, '0'));
  return Number.isSafeInteger(cents) ? (cents as Cents) : null;
}
