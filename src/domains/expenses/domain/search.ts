/** Minuscules, sans accents, virgule décimale : « Épicerie » et « epicerie » se valent, « 12.40 » et « 12,40 » aussi. */
export function normalizeSearchText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLocaleLowerCase('fr')
    .replace(/\./g, ',')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Vrai si chaque mot de la recherche se retrouve dans au moins un des champs.
 * « viande #avec-amis » ne garde que les dépenses qui contiennent les deux.
 */
export function matchesQuery(fields: readonly string[], query: string): boolean {
  const terms = normalizeSearchText(query).split(' ').filter(Boolean);
  if (terms.length === 0) return true;
  const haystack = fields.map(normalizeSearchText);
  return terms.every((term) => haystack.some((field) => field.includes(term)));
}
