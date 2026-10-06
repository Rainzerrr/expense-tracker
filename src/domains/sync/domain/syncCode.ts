import type { Brand } from '@/shared/lib/brand';

/**
 * Code secret de synchronisation : 28 caractères base32 Crockford, soit 140 bits (guide 10.4).
 * Il relie les appareils au même coffre sur le serveur ; qui le connaît peut lire les dépenses.
 */
export type SyncCode = Brand<string, 'SyncCode'>;

/** Base32 Crockford : pas de I, L, O, U (confusions à la saisie). */
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
export const SYNC_CODE_LENGTH = 28;
const GROUP_SIZE = 4;

export type RandomBytes = (length: number) => Uint8Array;
const secureRandom: RandomBytes = (length) => crypto.getRandomValues(new Uint8Array(length));

/** Un octet par caractère, réduit à 5 bits : 256 est un multiple de 32, le tirage reste uniforme. */
export function generateSyncCode(random: RandomBytes = secureRandom): SyncCode {
  return [...random(SYNC_CODE_LENGTH)].map((byte) => ALPHABET[byte % 32]).join('') as SyncCode;
}

/**
 * Lit un code saisi à la main : espaces, tirets et minuscules acceptés, et les lettres ambiguës
 * corrigées comme le prévoit Crockford (O → 0, I et L → 1). `null` si ce n'est pas un code.
 */
export function parseSyncCode(input: string): SyncCode | null {
  const cleaned = input
    .toUpperCase()
    .replace(/[\s-]/g, '')
    .replace(/O/g, '0')
    .replace(/[IL]/g, '1');
  if (cleaned.length !== SYNC_CODE_LENGTH) return null;
  return [...cleaned].every((char) => ALPHABET.includes(char)) ? (cleaned as SyncCode) : null;
}

/** « ABCD EFGH … » : 7 groupes de 4, plus faciles à recopier. */
export function formatSyncCode(code: SyncCode): string {
  return code.match(new RegExp(`.{1,${GROUP_SIZE}}`, 'g'))?.join(' ') ?? code;
}
