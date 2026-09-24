import { parseCsv } from './csvParser';

describe('parseCsv', () => {
  it('lit des lignes simples, en LF ou CRLF', () => {
    expect(parseCsv('a,b,c\n1,2,3\n')).toEqual([
      ['a', 'b', 'c'],
      ['1', '2', '3'],
    ]);
    expect(parseCsv('a,b\r\n1,2\r\n')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
  });

  it('lit la dernière ligne même sans retour à la ligne final', () => {
    expect(parseCsv('a,b\n1,2')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
  });

  it('respecte les guillemets : virgule, guillemet doublé et retour à la ligne dans un champ', () => {
    expect(parseCsv('a,b\n"x, y","dit ""oui""","l1\nl2"\n')).toEqual([
      ['a', 'b'],
      ['x, y', 'dit "oui"', 'l1\nl2'],
    ]);
  });

  it('détecte le point-virgule des tableurs français', () => {
    expect(parseCsv('Date;Montant\n2026-09-20;12,40\n')).toEqual([
      ['Date', 'Montant'],
      ['2026-09-20', '12,40'],
    ]);
  });

  it('une virgule entre guillemets ne compte pas pour la détection du séparateur', () => {
    expect(parseCsv('"a,b";c\n1;2\n')).toEqual([
      ['a,b', 'c'],
      ['1', '2'],
    ]);
  });

  it('retire la marque UTF-8 du début', () => {
    expect(parseCsv(`${String.fromCharCode(0xfeff)}a,b\n1,2\n`)[0]).toEqual(['a', 'b']);
  });

  it('garde les champs vides et ignore les lignes entièrement vides', () => {
    expect(parseCsv('a,,c\n\n,,\n1,2,3\n')).toEqual([
      ['a', '', 'c'],
      ['1', '2', '3'],
    ]);
  });

  it('un texte vide donne aucune ligne', () => {
    expect(parseCsv('')).toEqual([]);
  });
});
