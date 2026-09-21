import { areaPath, dayTicks, donutSegments, linePath, niceTicks, scaleLinear } from './chart';

describe('niceTicks', () => {
  it.each([
    [825, [0, 300, 600, 900]],
    [90, [0, 30, 60, 90]],
    [1000, [0, 500, 1000, 1500]],
    [0, [0, 50, 100, 150]],
  ])('un maximum de %d donne %j', (max, expected) => {
    expect(niceTicks(max)).toEqual(expected);
  });

  it('couvre toujours le maximum', () => {
    for (const max of [1, 7, 42, 199, 301, 824, 12345]) {
      expect(niceTicks(max).at(-1)).toBeGreaterThanOrEqual(max);
    }
  });
});

describe('dayTicks', () => {
  it('marque 1, puis tous les 5 jours, jusqu’au dernier jour', () => {
    expect(dayTicks(30)).toEqual([1, 5, 10, 15, 20, 25, 30]);
    expect(dayTicks(28)).toEqual([1, 5, 10, 15, 20, 25, 28]);
  });

  it('ajoute le 31 quand il est assez loin du 30', () => {
    expect(dayTicks(31)).toEqual([1, 5, 10, 15, 20, 25, 30]);
  });
});

describe('scaleLinear', () => {
  it('convertit une valeur vers l’échelle d’affichage, y compris inversée', () => {
    const y = scaleLinear([0, 900], [140, 20]);
    expect(y(0)).toBe(140);
    expect(y(900)).toBe(20);
    expect(y(450)).toBe(80);
  });

  it('ne divise pas par zéro', () => {
    expect(scaleLinear([5, 5], [0, 100])(5)).toBe(0);
  });
});

describe('tracés', () => {
  const points = [
    { x: 0, y: 10 },
    { x: 5, y: 4 },
  ];

  it('trace une ligne', () => {
    expect(linePath(points)).toBe('M0 10 L5 4');
  });

  it('referme une aire vers la ligne de base', () => {
    expect(areaPath(points, 20)).toBe('M0 10 L5 4 L5 20 L0 20 Z');
  });

  it('retourne un tracé vide sans point', () => {
    expect(areaPath([], 20)).toBe('');
    expect(linePath([])).toBe('');
  });
});

describe('donutSegments', () => {
  it('répartit la circonférence proportionnellement, avec un espace entre les arcs', () => {
    const segments = donutSegments([75, 25], 100, 2);
    expect(segments).toEqual([
      { length: 73, offset: 0 },
      { length: 23, offset: 75 },
    ]);
  });

  it('un arc unique est un cercle plein, sans espace', () => {
    expect(donutSegments([10], 100, 2)).toEqual([{ length: 100, offset: 0 }]);
  });

  it('ne dessine rien sans valeur', () => {
    expect(donutSegments([], 100)).toEqual([]);
    expect(donutSegments([0, 0], 100)).toEqual([]);
  });
});
