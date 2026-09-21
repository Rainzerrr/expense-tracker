import { monotonicFactory } from 'ulid';

// Monotone : deux identifiants créés dans la même milliseconde restent dans l'ordre de création.
const generate = monotonicFactory();

/** Identifiant généré côté client : permet de créer des données hors ligne sans conflit. */
export function newId(): string {
  return generate();
}
