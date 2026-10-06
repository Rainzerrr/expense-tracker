export type ShareResult = 'shared' | 'cancelled' | 'unsupported' | 'blocked';

/**
 * Ouvre le menu Partager du système (AirDrop, Messages, Mail, Enregistrer dans Fichiers…).
 * `unsupported` : ce navigateur ne sait pas partager un fichier, l'appelant doit le télécharger.
 * Fermer le menu sans rien choisir n'est pas une erreur (`cancelled`).
 *
 * Safari n'ouvre le menu que si l'appel suit directement le clic : le fichier doit être prêt
 * avant, aucun `await` (lecture de la base…) ne doit précéder cet appel. Sinon : `blocked`.
 */
export async function shareFile(file: File, title: string): Promise<ShareResult> {
  if (typeof navigator.share !== 'function' || typeof navigator.canShare !== 'function') {
    return 'unsupported';
  }
  // Chrome n'accepte dans le menu Partager qu'une liste fermée de types ET d'extensions (pas
  // `.json`) : on retente en texte, puis sous le même contenu nommé `.txt`.
  const asText = file.name.replace(/\.[^.]+$/, '') + '.txt';
  const candidates = [
    file,
    new File([file], file.name, { type: 'text/plain' }),
    new File([file], asText, { type: 'text/plain' }),
  ];
  const shareable = candidates.find((candidate) => navigator.canShare({ files: [candidate] }));
  if (!shareable) return 'unsupported';

  try {
    await navigator.share({ files: [shareable], title });
    return 'shared';
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled';
    if (error instanceof DOMException && error.name === 'NotAllowedError') return 'blocked';
    throw error;
  }
}

/** Télécharge un fichier créé en mémoire (il n'existe sur aucun serveur). */
export function downloadFile(file: File): void {
  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url;
  link.download = file.name;
  document.body.append(link);
  link.click();
  link.remove();
  // Laisse au navigateur le temps de lancer le téléchargement avant de libérer la mémoire.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
