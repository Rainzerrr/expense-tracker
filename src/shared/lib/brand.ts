/** Type « nominal » : empêche de mélanger un identifiant de dépense et un identifiant de catégorie. */
export type Brand<T, B extends string> = T & { readonly __brand: B };
