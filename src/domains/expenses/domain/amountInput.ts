export type AmountKey =
  '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | ',' | 'backspace';

const MAX_INTEGER_DIGITS = 7;
const MAX_DECIMALS = 2;

/** Applique une touche du pavé numérique à la saisie en cours (texte, virgule décimale). */
export function applyKeypadKey(value: string, key: AmountKey): string {
  if (key === 'backspace') return value.slice(0, -1);

  if (key === ',') {
    if (value.includes(',')) return value;
    return value === '' ? '0,' : `${value},`;
  }

  // Un chiffre : pas de « 00 », pas plus de 2 décimales, pas plus de 7 chiffres entiers.
  if (value === '0') return key;
  const [integer = '', decimals] = value.split(',');
  if (
    decimals === undefined ? integer.length >= MAX_INTEGER_DIGITS : decimals.length >= MAX_DECIMALS
  ) {
    return value;
  }
  return value + key;
}

/** Nettoie une saisie au clavier : chiffres et une seule virgule (le point est accepté). */
export function sanitizeAmountInput(raw: string): string {
  const cleaned = raw.replace(/\./g, ',').replace(/[^\d,]/g, '');
  const commaIndex = cleaned.indexOf(',');
  const rawInteger = commaIndex === -1 ? cleaned : cleaned.slice(0, commaIndex);
  const decimals =
    commaIndex === -1
      ? null
      : cleaned
          .slice(commaIndex + 1)
          .replace(/,/g, '')
          .slice(0, MAX_DECIMALS);

  const trimmed = rawInteger.replace(/^0+(?=\d)/, '').slice(0, MAX_INTEGER_DIGITS);
  const integer = trimmed === '' && decimals !== null ? '0' : trimmed;
  return decimals === null ? integer : `${integer},${decimals}`;
}

/** Centimes → texte de saisie : 1850 → « 18,50 », 1200 → « 12 ». Sert à préremplir la modification. */
export function formatAmountInput(cents: number): string {
  const euros = Math.trunc(cents / 100);
  const remainder = cents % 100;
  return remainder === 0 ? String(euros) : `${euros},${String(remainder).padStart(2, '0')}`;
}
