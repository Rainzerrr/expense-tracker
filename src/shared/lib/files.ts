export type ShareResult = 'shared' | 'cancelled' | 'unsupported';

/**
 * Ouvre le menu Partager du système (AirDrop, Messages, Mail, Enregistrer dans Fichiers…).
 * `unsupported` : ce navigateur ne sait pas partager un fichier, l'appelant doit le télécharger.
 * Fermer le menu sans rien choisir n'est pas une erreur (`cancelled`).
 */
export async function shareFile(file: File, title: string): Promise<ShareResult> {
  if (typeof navigator.share !== 'function' || typeof navigator.canShare !== 'function') {
    return 'unsupported';
  }
  // Certains navigateurs n'acceptent pas `application/json` dans le menu Partager : on retente en texte.
  const candidates = [file, new File([file], file.name, { type: 'text/plain' })];
  const shareable = candidates.find((candidate) => navigator.canShare({ files: [candidate] }));
  if (!shareable) return 'unsupported';

  try {
    await navigator.share({ files: [shareable], title });
    return 'shared';
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled';
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
