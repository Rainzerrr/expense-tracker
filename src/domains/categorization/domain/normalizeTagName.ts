const MAX_LENGTH = 30;

/**
 * Nom canonique d'un tag : minuscules, sans « # », espaces remplacés par des tirets.
 * Retourne null si rien d'utilisable ne reste. « #Avec amis » → « avec-amis ».
 */
export function normalizeTagName(raw: string): string | null {
  const name = raw
    .trim()
    .replace(/^#+/, '')
    .toLocaleLowerCase('fr')
    .replace(/\s+/g, '-')
    .replace(/[^\p{L}\p{N}_-]/gu, '')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, MAX_LENGTH);
  return name === '' ? null : name;
}
