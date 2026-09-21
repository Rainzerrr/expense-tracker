import { configure } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import 'fake-indexeddb/auto';
import '@/shared/i18n';

// jsdom n'implémente pas ces API de pointeur, que Radix (Toast, Select…) appelle.
// Le navigateur réel, lui, les fournit : ce sont des valeurs neutres, uniquement pour les tests.
Element.prototype.hasPointerCapture ??= () => false;
Element.prototype.setPointerCapture ??= () => {};
Element.prototype.releasePointerCapture ??= () => {};

// Les panneaux (saisie, modification) sont chargés à la demande : leur première compilation par
// Vitest, avec plusieurs fichiers de test en parallèle, peut dépasser la seconde par défaut.
configure({ asyncUtilTimeout: 5000 });
