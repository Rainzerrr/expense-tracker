import { matchesQuery, normalizeSearchText } from './search';

describe('normalizeSearchText', () => {
  it('ignore la casse et les accents', () => {
    expect(normalizeSearchText('  Épicerie  ')).toBe('epicerie');
    expect(normalizeSearchText('Événements ESN')).toBe('evenements esn');
  });

  it('unifie le séparateur décimal', () => {
    expect(normalizeSearchText('12.40')).toBe('12,40');
  });
});

describe('matchesQuery', () => {
  const fields = ['Viande', 'Courses', '#avec-amis', '12,40'];

  it('une recherche vide garde tout', () => {
    expect(matchesQuery(fields, '')).toBe(true);
    expect(matchesQuery(fields, '   ')).toBe(true);
  });

  it.each(['viande', 'VIANDE', 'vian', 'courses', '#avec-amis', 'avec', '12,4', '12.40'])(
    'trouve %j',
    (query) => {
      expect(matchesQuery(fields, query)).toBe(true);
    },
  );

  it('exige tous les mots, dans n’importe quel champ', () => {
    expect(matchesQuery(fields, 'viande courses')).toBe(true);
    expect(matchesQuery(fields, 'viande #avec-amis')).toBe(true);
    expect(matchesQuery(fields, 'viande uber')).toBe(false);
  });

  it('ne trouve pas ce qui n’y est pas', () => {
    expect(matchesQuery(fields, 'poisson')).toBe(false);
    expect(matchesQuery(fields, '13')).toBe(false);
  });

  it('trouve malgré les accents', () => {
    expect(matchesQuery(['Épicerie'], 'epicerie')).toBe(true);
    expect(matchesQuery(['Epicerie'], 'épicerie')).toBe(true);
  });
});
