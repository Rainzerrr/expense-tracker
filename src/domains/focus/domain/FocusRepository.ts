import type { Focus } from './focus';

export interface FocusRepository {
  /** Focus non supprimés, dans l'ordre d'affichage. */
  list(): Promise<Focus[]>;
  /** Crée ou remplace. */
  put(focuses: Focus[]): Promise<void>;
  /** Vrai si aucun focus n'a jamais existé (supprimés compris). */
  isEmpty(): Promise<boolean>;
}
