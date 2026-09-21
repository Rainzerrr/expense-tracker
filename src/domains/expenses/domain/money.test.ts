import { parseEuroInput, sumCents, toCents } from './money';

describe('parseEuroInput', () => {
  it.each([
    ['12,40', 1240],
    ['12.40', 1240],
    ['12', 1200],
    ['12,4', 1240],
    ['0,05', 5],
    ['  7,50 ', 750],
    ['1 240,50', 124050],
  ])('convertit %j en %i centimes', (input, expected) => {
    expect(parseEuroInput(input)).toBe(expected);
  });

  it.each(['', 'abc', '12,345', '12,', ',5', '-3', '1,2,3', '12€'])('refuse %j', (input) => {
    expect(parseEuroInput(input)).toBeNull();
  });

  it('refuse un montant trop grand pour être représenté exactement', () => {
    expect(parseEuroInput('99999999999999999')).toBeNull();
  });

  it('évite les erreurs de virgule flottante', () => {
    // 0,29 * 100 vaut 28.999999999999996 en flottant.
    expect(parseEuroInput('0,29')).toBe(29);
    expect(parseEuroInput('1,15')).toBe(115);
  });
});

describe('toCents / sumCents', () => {
  it('refuse un nombre non entier', () => {
    expect(() => toCents(12.5)).toThrow(RangeError);
    expect(() => toCents(Number.NaN)).toThrow(RangeError);
  });

  it('additionne des centimes', () => {
    expect(sumCents([1240, 850, 5])).toBe(2095);
    expect(sumCents([])).toBe(0);
  });
});
