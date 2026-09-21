import { normalizeTagName } from './normalizeTagName';

describe('normalizeTagName', () => {
  it.each([
    ['avec-amis', 'avec-amis'],
    ['#Avec amis', 'avec-amis'],
    ['  Soirée ESN  ', 'soirée-esn'],
    ['##cash', 'cash'],
    ['petit   plaisir', 'petit-plaisir'],
    ['what?!', 'what'],
    ['-x-', 'x'],
  ])('%j devient %j', (raw, expected) => {
    expect(normalizeTagName(raw)).toBe(expected);
  });

  it.each(['', '   ', '#', '!!!'])('refuse %j', (raw) => {
    expect(normalizeTagName(raw)).toBeNull();
  });

  it('limite la longueur', () => {
    expect(normalizeTagName('a'.repeat(80))).toHaveLength(30);
  });
});
