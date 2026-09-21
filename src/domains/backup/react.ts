// Point d'entrée React « léger » : ce que le dashboard utilise (le rappel de sauvegarde).
// Les cartes d'envoi, d'import et de CSV sont dans `data.ts`, chargé avec l'écran Réglages seulement.
export { useBackupStatus } from './application/useBackupStatus';
export { BackupReminder } from './ui/BackupReminder';
