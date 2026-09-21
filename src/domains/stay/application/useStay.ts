import { DEFAULT_STAY } from '../domain/stay';
import type { Stay } from '../domain/stay';

/** Pour l'instant les dates sont celles par défaut ; les réglages les rendront modifiables. */
export function useStay(): Stay {
  return DEFAULT_STAY;
}
