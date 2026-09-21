import { applyKeypadKey, formatAmountInput, sanitizeAmountInput } from './amountInput';
import type { AmountKey } from './amountInput';
import { parseEuroInput } from './money';

const press = (keys: AmountKey[], start = '') => keys.reduce(applyKeypadKey, start);

describe('applyKeypadKey', () => {
  it('compose 12,40 touche par touche', () => {
    expect(press(['1', '2', ',', '4', '0'])).toBe('12,40');
  });

  it('commence par « 0, » quand on tape la virgule en premier', () => {
    expect(press([','])).toBe('0,');
  });

  it('ignore une deuxième virgule', () => {
    expect(press(['1', ',', ',', '5'])).toBe('1,5');
  });

  it('remplace un zéro initial au lieu de coller « 05 »', () => {
    expect(press(['0', '5'])).toBe('5');
    expect(press(['0', '0', '0'])).toBe('0');
  });

  it('refuse une troisième décimale', () => {
    expect(press(['1', ',', '2', '5', '9'])).toBe('1,25');
  });

  it('limite la partie entière à 7 chiffres', () => {
    expect(press(['1', '2', '3', '4', '5', '6', '7', '8'])).toBe('1234567');
  });

  it('efface le dernier caractère, sans planter sur une saisie vide', () => {
    expect(press(['backspace'], '12,4')).toBe('12,');
    expect(press(['backspace'], '')).toBe('');
  });
});

describe('sanitizeAmountInput', () => {
  it.each([
    ['12,40', '12,40'],
    ['12.40', '12,40'],
    ['abc12€', '12'],
    ['1,2,3', '1,23'],
    ['12,345', '12,34'],
    ['007', '7'],
    ['000', '0'],
    [',5', '0,5'],
    ['', ''],
    ['12345678', '1234567'],
  ])('%j devient %j', (raw, expected) => {
    expect(sanitizeAmountInput(raw)).toBe(expected);
  });
});

describe('formatAmountInput', () => {
  it.each([
    [1850, '18,50'],
    [1240, '12,40'],
    [1200, '12'],
    [5, '0,05'],
    [1205, '12,05'],
  ])('%i centimes donnent %j', (cents, expected) => {
    expect(formatAmountInput(cents)).toBe(expected);
  });

  it('est l’inverse de la saisie', () => {
    for (const cents of [1, 99, 100, 1240, 1850, 99999]) {
      expect(parseEuroInput(formatAmountInput(cents))).toBe(cents);
    }
  });
});
