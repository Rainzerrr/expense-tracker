const SEPARATOR = ';';
const LINE_BREAK = '\r\n';
// Sans cette marque, Excel lit le fichier en ANSI et casse « é » et « € ».
const BYTE_ORDER_MARK = String.fromCharCode(0xfeff);

/** Un texte qui commencerait par = + - @ serait exécuté comme une formule par un tableur : on le neutralise. */
const defuseFormula = (field: string) => (/^[=+\-@]/.test(field) ? `'${field}` : field);

function escapeField(raw: string): string {
  const field = defuseFormula(raw);
  return /[";\r\n]/.test(field) ? `"${field.replace(/"/g, '""')}"` : field;
}

/**
 * CSV pour un tableur français : séparateur « ; », fin de ligne CRLF, encodage UTF-8 avec marque.
 * La première ligne est l'en-tête.
 */
export function toCsv(rows: readonly (readonly string[])[]): string {
  return (
    BYTE_ORDER_MARK +
    rows.map((row) => row.map(escapeField).join(SEPARATOR)).join(LINE_BREAK) +
    LINE_BREAK
  );
}

/** 1240 → « 12,40 » : virgule décimale, lue comme un nombre par un tableur français. */
export function formatCsvAmount(cents: number): string {
  return (cents / 100).toFixed(2).replace('.', ',');
}
