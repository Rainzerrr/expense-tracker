// Point d'entrée React « léger » : ce que le dashboard utilise (les cartes « Mes focus »).
// Le détail d'un focus est dans `detail.ts`, la gestion dans `manager.ts` : chargés avec leur écran seulement.
export { useFocuses } from './application/useFocus';
export { FocusCards } from './ui/FocusCards';
