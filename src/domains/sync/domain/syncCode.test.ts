import { formatSyncCode, generateSyncCode, parseSyncCode, SYNC_CODE_LENGTH } from './syncCode';

describe('code de synchronisation', () => {
  it('fait 28 caractères base32 Crockford, tirés au hasard', () => {
    const code = generateSyncCode();
    expect(code).toMatch(/^[0-9A-HJKMNP-TV-Z]{28}$/);
    expect(generateSyncCode()).not.toBe(code);
  });

  it('utilise tout l’alphabet, uniformément (un octet par caractère, modulo 32)', () => {
    const bytes = Uint8Array.from({ length: SYNC_CODE_LENGTH }, (_, index) => index + 224);
    expect(generateSyncCode(() => bytes)).toBe('0123456789ABCDEFGHJKMNPQRSTV');
  });

  it('se lit tel qu’on le recopie : espaces, tirets, minuscules, lettres ambiguës', () => {
    const code = generateSyncCode();
    expect(parseSyncCode(formatSyncCode(code))).toBe(code);
    expect(parseSyncCode(code.toLowerCase())).toBe(code);
    expect(parseSyncCode('oooo-iiii llll 0000 1111 2222 3333')).toBe(
      '0000111111110000111122223333',
    );
  });

  it('refuse ce qui n’est pas un code', () => {
    expect(parseSyncCode('')).toBeNull();
    expect(parseSyncCode('ABCD')).toBeNull();
    expect(parseSyncCode('U'.repeat(SYNC_CODE_LENGTH))).toBeNull();
    expect(parseSyncCode('A'.repeat(SYNC_CODE_LENGTH + 1))).toBeNull();
  });

  it('s’affiche en 7 groupes de 4', () => {
    expect(formatSyncCode('0123456789ABCDEFGHJKMNPQRSTV' as never)).toBe(
      '0123 4567 89AB CDEF GHJK MNPQ RSTV',
    );
  });
});
