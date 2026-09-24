import { parseAmountCents, parseRevolutStatement } from './revolutStatement';

const HEADER = 'Type,Produit,Date de début,Date de fin,Description,Montant,Frais,Devise,État,Solde';
const csv = (...lines: string[]) => [HEADER, ...lines].join('\n');

describe('parseAmountCents', () => {
  it.each([
    ['-40.46', -4046],
    ['200.00', 20000],
    ['12,40', 1240],
    ['1,234.56', 123456],
    ['1.234,56', 123456],
    ['-0.51', -51],
    ['0', 0],
    ['+5', 500],
  ])('%j donne %i centimes', (raw, expected) => {
    expect(parseAmountCents(raw)).toBe(expected);
  });

  it.each(['', 'abc', '12€', '1..2.', '--3'])('refuse %j', (raw) => {
    expect(parseAmountCents(raw)).toBeNaN();
  });

  it('évite l’erreur de virgule flottante', () => {
    expect(parseAmountCents('-0.29')).toBe(-29);
    expect(parseAmountCents('1.15')).toBe(115);
  });
});

describe('parseRevolutStatement', () => {
  const row =
    'Paiement par carte,Valeur actuelle,2026-09-01 18:34:52,2026-09-02 10:34:58,Primaprix,-38.25,0.00,EUR,TERMINÉ,222.60';

  it('lit un relevé français : date de début, commerçant, montant signé, état', () => {
    const result = parseRevolutStatement(csv(row));
    expect(result).toEqual({
      ok: true,
      unreadableRows: 0,
      rows: [
        {
          type: 'Paiement par carte',
          startedAt: '2026-09-01 18:34:52',
          date: '2026-09-01',
          description: 'Primaprix',
          amountCents: -3825,
          feeCents: 0,
          currency: 'EUR',
          state: 'completed',
        },
      ],
    });
  });

  it('utilise la date de DÉBUT (l’achat), pas celle de fin (le règlement)', () => {
    const late =
      'Paiement par carte,Valeur actuelle,2026-08-29 17:33:22,2026-09-01 09:09:27,Amazon,-40.46,0.00,EUR,TERMINÉ,110.83';
    const [only] = (parseRevolutStatement(csv(late)) as { rows: { date: string }[] }).rows;
    expect(only?.date).toBe('2026-08-29');
  });

  it('reconnaît les états terminé, en attente et les autres', () => {
    const states = ['TERMINÉ', 'EN ATTENTE', 'ANNULÉ'].map((s) => row.replace('TERMINÉ', s));
    const result = parseRevolutStatement(csv(...states));
    expect(result.ok && result.rows.map((r) => r.state)).toEqual(['completed', 'pending', 'other']);
  });

  it('lit aussi les colonnes anglaises et le point-virgule', () => {
    const en =
      'Type;Product;Started Date;Completed Date;Description;Amount;Fee;Currency;State;Balance\nCARD_PAYMENT;Current;2026-09-01 10:00:00;;Lidl;-3,50;0,00;EUR;COMPLETED;9,00';
    const result = parseRevolutStatement(en);
    expect(result.ok && result.rows[0]).toMatchObject({
      description: 'Lidl',
      amountCents: -350,
      state: 'completed',
    });
  });

  it('accepte une date de fin vide (opération en attente)', () => {
    const pending =
      'Paiement par carte,Valeur actuelle,2026-09-21 19:33:52,,Continente,-9.99,0.00,EUR,EN ATTENTE,';
    const result = parseRevolutStatement(csv(pending));
    expect(result.ok && result.rows[0]?.state).toBe('pending');
  });

  it('lit un commerçant contenant une virgule entre guillemets', () => {
    const quoted =
      'Paiement par carte,Valeur actuelle,2026-09-05 12:00:00,2026-09-06 08:00:00,"Café, Bar & Co",-4.50,0.00,EUR,TERMINÉ,1.00';
    const result = parseRevolutStatement(csv(quoted));
    expect(result.ok && result.rows[0]?.description).toBe('Café, Bar & Co');
  });

  it('garde les frais en valeur absolue', () => {
    const fee =
      'Paiement par carte,Valeur actuelle,2026-09-05 12:00:00,2026-09-06 08:00:00,Marchand,-20.00,-0.50,EUR,TERMINÉ,1.00';
    const result = parseRevolutStatement(csv(fee));
    expect(result.ok && result.rows[0]?.feeCents).toBe(50);
  });

  it('compte les lignes illisibles sans perdre les autres', () => {
    const result = parseRevolutStatement(
      csv(row, 'Paiement par carte,Valeur actuelle,hier,,Truc,-1.00,0.00,EUR,TERMINÉ,1', 'a,b'),
    );
    expect(result).toMatchObject({ ok: true, unreadableRows: 2 });
    expect(result.ok && result.rows).toHaveLength(1);
  });

  it('refuse un fichier vide ou qui n’est pas un relevé', () => {
    expect(parseRevolutStatement('')).toEqual({ ok: false, error: 'empty' });
    expect(parseRevolutStatement('Date;Montant\n2026-09-20;12,40')).toEqual({
      ok: false,
      error: 'notAStatement',
    });
  });
});
