import { formatCsvAmount, toCsv } from './csv';

const BOM = String.fromCharCode(0xfeff);

describe('toCsv', () => {
  it('sépare par « ; », termine chaque ligne en CRLF et commence par la marque UTF-8', () => {
    const csv = toCsv([
      ['Date', 'Montant'],
      ['2026-09-20', '12,40'],
    ]);
    expect(csv).toBe(`${BOM}Date;Montant\r\n2026-09-20;12,40\r\n`);
  });

  it('met entre guillemets ce qui contient « ; », un guillemet ou un retour à la ligne', () => {
    expect(toCsv([['a;b', 'dit "oui"', 'l1\nl2']])).toBe(`${BOM}"a;b";"dit ""oui""";"l1\nl2"\r\n`);
  });

  it('garde les accents et le symbole euro tels quels', () => {
    expect(toCsv([['Épicerie', 'Fruits & légumes']])).toContain('Épicerie;Fruits & légumes');
  });

  it.each(['=SOMME(A1:A9)', '+1', '-2', '@cmd'])('neutralise la formule %j', (field) => {
    expect(toCsv([[field]])).toBe(`${BOM}'${field}\r\n`);
  });

  it('laisse un champ vide vide', () => {
    expect(toCsv([['a', '', 'c']])).toBe(`${BOM}a;;c\r\n`);
  });
});

describe('formatCsvAmount', () => {
  it.each([
    [1240, '12,40'],
    [5, '0,05'],
    [100000, '1000,00'],
  ])('%i centimes donnent %j', (cents, expected) => {
    expect(formatCsvAmount(cents)).toBe(expected);
  });
});
