# Guide technique et bonnes pratiques

**Projet : suivi de dépenses Erasmus à Lisbonne (PWA iPhone + site web Mac)**

Ce document est la référence technique du projet. Il est écrit pour être donné tel quel à un développeur ou à un assistant de code (Claude Code, par exemple) avant de commencer à coder. Les maquettes associées sont dans `maquettes-erasmus-lisbonne.html`.

---

## 1. Principes directeurs

Ces règles priment sur toutes les autres en cas de doute.

1. **Mobile first, sans exception.** L'application est d'abord conçue, écrite et testée pour un iPhone (390 px de large). Le desktop est une amélioration progressive, jamais l'inverse. Voir la section 4.
2. **Local first / offline first.** La base locale du navigateur (IndexedDB) est la source de vérité. L'application fonctionne sans réseau, la synchronisation est un plus.
3. **Le domaine d'abord.** La logique métier (calcul de projection, agrégats, règles sur les montants) vit dans du TypeScript pur, testé, sans React ni base de données.
4. **Aucun texte en dur.** Tout texte visible ou lu par un lecteur d'écran passe par le système de traduction.
5. **CSS prévisible.** SCSS avec la nomenclature BEM, des tokens de design, aucune surcharge de spécificité.
6. **Accessible par défaut.** HTML sémantique, contrastes AA, cibles tactiles de 44 px minimum, focus visible.
7. **Simple avant tout.** Un seul utilisateur, une seule devise, pas de compte. On n'ajoute pas de bibliothèque ou de couche « au cas où ».

---

## 2. Périmètre fonctionnel (rappel)

- Un seul utilisateur, pas de compte. Accès aux données protégé par un **code secret** saisi une fois par appareil.
- Une seule base de données logique, synchronisée entre l'iPhone (PWA installée) et le Mac (site web).
- Saisie d'une dépense : **montant, catégorie (avec sous-catégorie), date**, tags libres optionnels. Date modifiable pour rattraper les jours passés.
- Catégories, sous-catégories et tags modifiables. Focus sur une catégorie, une sous-catégorie ou un tag.
- Dashboard du **mois en cours** (du 1er au dernier jour du mois calendaire) : total, moyenne par jour, projection de fin de mois, répartition par catégorie, courbe du mois, focus épinglés, dernières dépenses.
- Historique avec recherche, filtres, modification et suppression (avec « Annuler »).
- Réglages : dates du séjour, synchronisation, organisation, export CSV/JSON, import, effacement, thème.
- Séjour : du 1er septembre 2026 au 31 janvier 2027 (153 jours). Devise : euro. Langue : français.

---

## 3. Stack technique

| Domaine | Choix | Raison |
|---|---|---|
| Build | **Vite** + **React 18** + **TypeScript** en mode `strict` | Démarrage rapide, standard, typage strict |
| Routage | **React Router** (routes chargées à la demande) | Découpage du code par écran |
| Styles | **SCSS** (modules Sass, `@use`) + **BEM** + variables CSS | Voir section 7 |
| Composants non stylés | **Radix UI** (Dialog, Select, Tabs, Toast, Popover) | Accessibilité gérée, on garde 100 % du style |
| Base locale | **Dexie** (IndexedDB) + `dexie-react-hooks` (`useLiveQuery`) | Requêtes réactives, adapté à l'offline |
| État d'interface | **Zustand** | Léger, pour l'état éphémère uniquement (filtres, panneaux ouverts) |
| Formulaires | **React Hook Form** + **Zod** | Validation partagée avec le domaine |
| Traductions | **i18next** + **react-i18next** | Voir section 8 |
| Graphiques | **Recharts**, chargé à la demande | Donut et courbes du dashboard |
| Dates | **date-fns** (locale `fr`) | Calculs de mois et de jours fiables |
| PWA | **vite-plugin-pwa** (Workbox) | Manifest, service worker, mises à jour |
| Synchronisation | **Cloudflare Pages Functions** + **D1** | Un seul déploiement, aucune clé à brancher |
| Tests | **Vitest**, **Testing Library**, **Playwright** | Domaine, composants, parcours |
| Qualité | ESLint (`typescript-eslint`, `react-hooks`, `jsx-a11y`, `i18next`), Prettier, stylelint, Husky + lint-staged | Cohérence automatique |

Remarque : la première idée était Tailwind + shadcn/ui. Ce guide retient **SCSS + BEM**, donc on n'utilise ni Tailwind ni bibliothèque de composants déjà stylée.

---

## 4. Mobile first (règle n°1)

### 4.1 Principe

- On **conçoit** l'écran mobile en premier, on l'**écrit** en CSS mobile en premier, on le **teste** sur mobile en premier.
- Le CSS de base (sans media query) décrit l'affichage iPhone. Les écrans plus larges ajoutent des règles avec `min-width`.
- **Interdit** : `max-width` dans les media queries, sauf cas exceptionnel documenté en commentaire.
- Un écran plus large n'est pas un écran mobile étiré : on réorganise (barre latérale, tableau, panneau latéral) au lieu d'agrandir.

### 4.2 Points de rupture

```scss
// shared/styles/abstracts/_breakpoints.scss
@use 'sass:map';

$breakpoints: (
  'sm': 480px,   // grand téléphone
  'md': 768px,   // tablette
  'lg': 1024px,  // ordinateur portable : la barre latérale remplace la barre du bas
  'xl': 1280px,  // grand écran
);

@mixin up($key) {
  @media (min-width: map.get($breakpoints, $key)) {
    @content;
  }
}
```

Utilisation : `@include up(lg) { ... }`. Le mixin `up` est le seul moyen d'écrire une media query de largeur.

### 4.3 Adaptation des écrans (comme dans les maquettes)

| Élément | Mobile (< 1024 px) | Desktop (≥ 1024 px) |
|---|---|---|
| Navigation | Barre du bas avec bouton « + » central | Barre latérale à gauche |
| Ajout d'une dépense | Écran plein avec pavé numérique intégré | Panneau latéral avec champs et raccourcis clavier (⌘↵, Échap) |
| Historique | Liste groupée par jour, actions par glissement | Tableau avec panneau de modification à droite |
| Dashboard | Une colonne de cartes | Grille : 4 chiffres clés, graphes côte à côte |
| Réglages | Liste groupée façon iOS | Deux colonnes de cartes |
| Modification | Écran dédié | Panneau à droite du tableau |

### 4.4 Règles tactiles et iOS

- **Cibles tactiles** : 44 × 44 px minimum (variable `$touch-target`).
- **Zones sûres** : `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">` et `padding-bottom: env(safe-area-inset-bottom)` sur la barre du bas.
- **Hauteur d'écran** : utiliser `100dvh`, jamais `100vh` (la barre d'adresse d'iOS fausse `vh`).
- **Champs de saisie** : `font-size` d'au moins 16 px, sinon iOS zoome au focus. Montant : `inputmode="decimal"`.
- **Survol** : tout style `:hover` est enveloppé dans `@media (hover: hover)` pour ne pas rester « collé » au toucher.
- **Actions principales en bas** : le pouce atteint le bas de l'écran (bouton « + », « Enregistrer »).
- **Aucun défilement horizontal de la page.** Seules les rangées de puces et les tableaux ont un défilement interne, volontaire.
- **Geste de glissement** (supprimer/modifier) : toujours doublé par une alternative visible (ouvrir la ligne puis bouton), car un geste seul n'est pas accessible.

### 4.5 Typographie et espacements

- Échelle d'espacement de 4 px (`space(1)` = 4 px, `space(2)` = 8 px, etc.).
- Tailles de texte fluides avec `clamp()` uniquement pour les titres. Le texte courant reste à 15–16 px.
- Chiffres alignés : `font-variant-numeric: tabular-nums` sur tous les montants.

### 4.6 Performance sur mobile

Budgets à respecter, à vérifier avec Lighthouse en mode mobile :

- JavaScript initial ≤ 170 Ko compressé (gzip). Recharts et l'écran Réglages sont chargés à la demande.
- LCP < 2,5 s sur une connexion 4G moyenne.
- Polices auto-hébergées (pas de CDN, pour marcher hors ligne), sous-ensemble latin, `font-display: swap`.
- Pas d'image raster. Icônes en SVG.
- Liste de plus de 300 lignes : virtualisation avec `@tanstack/react-virtual`.

### 4.7 Tests mobile first

- Playwright : le projet « iPhone 14 » est **le premier** et le projet par défaut. Les projets « Desktop Chrome » et « Desktop Safari » viennent ensuite.
- Chaque nouveau composant a un test à 390 px avant tout test desktop.
- Storybook (si utilisé) s'ouvre par défaut sur la vue iPhone.

### 4.8 Checklist mobile first (à cocher pour chaque écran)

- [ ] Le CSS de base est mobile, les ajouts desktop sont dans des `up(...)`.
- [ ] Rien ne déborde à 360 px de large.
- [ ] Toutes les cibles tactiles font au moins 44 px.
- [ ] Les champs ont au moins 16 px de police.
- [ ] La barre du bas et le clavier virtuel ne cachent pas un champ ou un bouton.
- [ ] Les zones sûres iOS sont respectées.
- [ ] Le rendu à 768, 1024 et 1440 px est vérifié.
- [ ] L'écran fonctionne sans réseau.

---

## 5. Architecture et DDD (Domain-Driven Design)

### 5.1 Langage ubiquitaire

Un seul vocabulaire, dans les maquettes, dans le code et dans les tests.

| Français (interface) | Code (anglais) |
|---|---|
| Dépense | `Expense` |
| Catégorie | `Category` |
| Sous-catégorie | `Subcategory` |
| Tag | `Tag` |
| Focus | `Focus` |
| Séjour | `Stay` |
| Projection de fin de mois | `MonthProjection` |
| Moyenne par jour hors logement | `variableDailyAverage` |
| Code secret | `SyncSecret` |

### 5.2 Contextes délimités (bounded contexts)

| Contexte | Responsabilité |
|---|---|
| `expenses` | Cœur du produit : saisie, modification, suppression, historique |
| `categorization` | Catégories, sous-catégories, tags |
| `analytics` | Totaux, moyennes, projection, répartition, focus |
| `stay` | Dates du séjour, mois affiché, réglages généraux |
| `sync` | Code secret, synchronisation, sauvegarde et import |

Un contexte n'importe pas les fichiers internes d'un autre : il passe par son fichier `index.ts` public.

### 5.3 Couches et règle de dépendance

```
presentation (React)  →  application (cas d'usage, hooks)  →  domain (TypeScript pur)
                                      ↓
                             infrastructure (Dexie, API)   implémente les interfaces du domain
```

- **domain** : entités, objets valeur, services de domaine, interfaces de dépôts (« ports »). Aucun import de React, Dexie, i18next ou `fetch`.
- **application** : cas d'usage (`addExpense`, `deleteExpense`, `getMonthSummary`) et hooks qui les exposent à React.
- **infrastructure** : implémentation des dépôts avec Dexie, client HTTP de synchronisation.
- **presentation** : composants React. Ils appellent les hooks de la couche application, jamais Dexie directement.

Les dépendances vont toujours vers le domaine, jamais l'inverse.

### 5.4 Modèle du domaine

**Règles de données**

- Les montants sont des **entiers en centimes** (`1240` pour 12,40 €). Jamais de nombres à virgule.
- Les dates d'une dépense sont des **dates locales** au format `YYYY-MM-DD` (fuseau Europe/Lisbon), pas des horodatages. Une dépense du 19 septembre reste au 19 septembre quel que soit le fuseau de l'appareil.
- Les identifiants (`id`) sont des ULID générés côté client, pour créer des données hors ligne sans conflit.
- La suppression est **logique** (`deletedAt`), pour pouvoir annuler et synchroniser la suppression.

```ts
// domains/expenses/domain/money.ts
export type Cents = number & { readonly __brand: 'Cents' };

/** "12,40" → 1240. Retourne null si la saisie est invalide. */
export function parseEuroInput(input: string): Cents | null {
  const normalized = input.trim().replace(/\s/g, '').replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  const [int, dec = ''] = normalized.split('.');
  return (Number(int) * 100 + Number(dec.padEnd(2, '0'))) as Cents;
}
```

```ts
// domains/expenses/domain/expense.ts
export interface Expense {
  id: ExpenseId;                       // ULID
  amount: Cents;                       // strictement positif
  categoryId: CategoryId;
  subcategoryId: SubcategoryId | null; // doit appartenir à categoryId
  tagIds: TagId[];
  date: LocalDate;                     // 'YYYY-MM-DD'
  createdAt: IsoInstant;
  updatedAt: IsoInstant;
  deletedAt: IsoInstant | null;
}
```

**Invariants** (vérifiés dans une fonction de création `createExpense`) : montant > 0, la sous-catégorie appartient à la catégorie, la date est valide.

### 5.5 Calcul de la projection de fin de mois

Le loyer est payé le 1er du mois. Diviser le total par le nombre de jours écoulés fausserait la projection. On sépare donc les dépenses **fixes** (catégorie Logement) des dépenses **variables** :

```ts
// domains/analytics/domain/projectMonthEnd.ts
export function projectMonthEnd(input: {
  expenses: Expense[];
  today: LocalDate;
  monthStart: LocalDate;
  monthEnd: LocalDate;
  fixedCategoryIds: CategoryId[];
}): MonthProjection {
  const spent = sum(input.expenses);
  const variableSpent = sum(input.expenses.filter((e) => !input.fixedCategoryIds.includes(e.categoryId)));
  const elapsedDays = daysBetween(input.monthStart, input.today) + 1;
  const remainingDays = daysBetween(input.today, input.monthEnd);
  const variableDailyAverage = variableSpent / elapsedDays;
  return {
    spent,
    variableDailyAverage,
    projectedTotal: spent + variableDailyAverage * remainingDays,
  };
}
```

**Cas de test de référence (issu des maquettes)** : au jour 20 sur 30 de septembre, 970 € dépensés dont 420 € de loyer donnent une moyenne de 27,50 € par jour (550 ÷ 20) et une projection de **1 245 €** (970 + 27,50 × 10). Septembre a **30 jours** : on utilise `endOfMonth` de date-fns, jamais un « 31 » écrit en dur.

### 5.6 Dépôts (ports) et cas d'usage

```ts
// domains/expenses/domain/ExpenseRepository.ts
export interface ExpenseRepository {
  add(expense: Expense): Promise<void>;
  update(expense: Expense): Promise<void>;
  softDelete(id: ExpenseId, at: IsoInstant): Promise<void>;
  restore(id: ExpenseId): Promise<void>;          // pour « Annuler »
  findByMonth(month: YearMonth): Promise<Expense[]>;
}
```

L'implémentation Dexie vit dans `infrastructure/`. Les tests du domaine utilisent une version en mémoire.

---

## 6. Structure des dossiers et Atomic Design

### 6.1 Arborescence

```
src/
├── app/                          # démarrage : providers, routeur, init i18n, enregistrement PWA
├── domains/
│   ├── expenses/
│   │   ├── domain/               # entités, objets valeur, ports (TS pur)
│   │   ├── application/          # cas d'usage et hooks (useAddExpense…)
│   │   ├── infrastructure/       # dépôt Dexie
│   │   └── ui/                   # organismes propres au domaine (ExpenseForm, ExpenseList…)
│   ├── categorization/
│   ├── analytics/
│   ├── stay/
│   └── sync/
├── shared/
│   ├── ui/
│   │   ├── atoms/                # Button, Chip, Input, Icon, Dot…
│   │   ├── molecules/            # StatTile, SegmentedControl, SearchField…
│   │   ├── organisms/            # BottomNav, Sidebar, Sheet…
│   │   └── templates/            # AppShell
│   ├── styles/                   # abstracts, base, layout, utilities (section 7)
│   ├── i18n/                     # init, locales, helpers de formatage (section 8)
│   └── lib/                      # utilitaires purs (dates, clsx…)
├── pages/                        # une page par route (DashboardPage, HistoryPage…)
└── main.tsx
```

Alias d'import : `@/` pointe vers `src/`. On n'écrit pas de chemins relatifs qui remontent de plus de deux niveaux.

### 6.2 Les niveaux d'Atomic Design

| Niveau | Rôle | Connaît le domaine ? | Exemples du projet |
|---|---|---|---|
| **Atomes** | Éléments de base, sans logique métier | Non | `Button`, `IconButton`, `Chip`, `Dot`, `Input`, `Icon`, `Heading`, `Amount` |
| **Molécules** | Assemblage de quelques atomes | Non | `StatTile`, `SegmentedControl`, `SearchField`, `DateQuickPicker`, `ListRow` |
| **Organismes** | Blocs complets de l'interface | Oui, via props ou hooks | `ExpenseForm`, `ExpenseList`, `ExpenseTable`, `CategoryDonut`, `CumulativeChart`, `FocusCard`, `EditPanel`, `BottomNav`, `Sidebar` |
| **Templates** | Mise en page d'un écran, sans données | Non | `AppShell` (barre du bas sur mobile, barre latérale sur desktop), `DashboardLayout` |
| **Pages** | Template + données réelles | Oui | `DashboardPage`, `HistoryPage`, `FocusPage`, `SettingsPage`, `ExpenseCreatePage` |

**Règles**

1. Un niveau n'importe que les niveaux inférieurs (atome → molécule → organisme → template → page).
2. Les atomes et molécules ne contiennent **aucune** logique métier et ne lisent ni Dexie ni le store : tout passe par les props.
3. Les organismes génériques (`BottomNav`, `Sidebar`) vont dans `shared/ui/organisms`. Les organismes qui parlent d'un domaine (`ExpenseForm`) vont dans `domains/<contexte>/ui`.
4. Les pages sont fines : elles branchent les hooks de la couche application sur des organismes.

### 6.3 Organisation d'un composant

```
shared/ui/atoms/Button/
├── Button.tsx
├── Button.scss
├── Button.test.tsx
└── index.ts
```

- Un composant par fichier, **export nommé** (pas d'export par défaut).
- Nom du composant en `PascalCase`, hooks en `useXxx`, props dans une interface `XxxProps`.
- Le nom du bloc BEM est le nom du composant en `kebab-case` (`ExpenseRow` → `.expense-row`).
- Fichiers `index.ts` (barrels) uniquement à la racine d'un contexte ou d'un composant, pas partout.

---

## 7. SCSS et BEM

### 7.1 Règles BEM

- Format : `bloc__element--modificateur`, en `kebab-case`. Exemple : `.expense-row__amount`, `.expense-row--selected`.
- **Un bloc = un composant**, le nom du bloc est unique dans tout le projet.
- **Un seul niveau d'élément** : `.card__title` est correct, `.card__header__title` est interdit (on écrit `.card__title`).
- Un modificateur décrit une variante ou un état : `--selected`, `--size-lg`, `--tone-danger`. On l'ajoute à côté de la classe de base, jamais seul.
- Pas de sélecteur d'identifiant (`#id`), pas de `!important`, pas de sélecteur de balise à l'intérieur d'un bloc.
- Imbrication SCSS limitée à **2 niveaux**, avec `&__element` et `&--modificateur`.
- Un état d'accessibilité se style avec l'attribut ARIA : `.tabs__tab[aria-selected='true']`, plutôt qu'une classe `is-active`.
- Un fichier SCSS par composant, placé à côté du fichier `.tsx` et importé par lui.

### 7.2 Dossier de styles globaux

```
shared/styles/
├── abstracts/     # _tokens.scss, _breakpoints.scss, _functions.scss, _mixins.scss (aucune sortie CSS)
├── base/          # _reset.scss, _typography.scss, _focus.scss
├── layout/        # _app-shell.scss (grille générale mobile → desktop)
├── utilities/     # _visually-hidden.scss (préfixe u-, très peu de classes)
└── main.scss      # importe les fichiers ci-dessus avec @use
```

On utilise `@use` et `@forward` (jamais `@import`). On évite `@extend`.

### 7.3 Tokens de design

Les valeurs viennent des maquettes. Elles sont exposées en **variables CSS** (pour le thème clair/sombre et la couleur d'accent modifiable) et une fois en SCSS pour les fonctions.

```scss
// shared/styles/abstracts/_tokens.scss
:root {
  // Couleurs de base
  --color-ink: #1d1b2e;
  --color-text-muted: #6b6880;
  --color-border: #eceaf3;
  --color-ground: #f6f5f1;
  --color-surface: #ffffff;
  --color-accent: #5b4bdb;
  --color-accent-soft: #f1eeff;
  --color-danger: #b23431;

  // Une couleur par catégorie
  --category-housing: #8b7cf6;
  --category-groceries: #19a974;
  --category-activities: #f59e42;
  --category-transport: #3b9eeb;
  --category-travel: #ec6b9a;
  --category-subscriptions: #14b8c4;
  --category-health: #ef6461;
  --category-shopping: #d9a521;
  --category-misc: #a3a1b5;

  // Formes et ombres
  --radius-sm: 14px;
  --radius-md: 16px;
  --radius-lg: 24px;
  --radius-xl: 28px;
  --shadow-card: 0 1px 2px rgb(29 27 46 / 4%), 0 8px 24px rgb(29 27 46 / 5%);

  // Typographie
  --font-display: 'Bricolage Grotesque', 'DM Sans', system-ui, sans-serif;
  --font-body: 'DM Sans', system-ui, sans-serif;
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme='light']) { /* valeurs sombres */ }
}
:root[data-theme='dark'] { /* valeurs sombres */ }
```

```scss
// shared/styles/abstracts/_functions.scss
$space-unit: 4px;
$touch-target: 44px;

@function space($n) {
  @return $n * $space-unit;
}
```

### 7.4 Exemple complet : composant `ExpenseRow`

```scss
// domains/expenses/ui/ExpenseRow/ExpenseRow.scss
@use '@/shared/styles/abstracts' as *;

.expense-row {
  display: flex;
  align-items: center;
  gap: space(3);
  min-height: $touch-target;
  padding-block: space(2);

  &__icon {
    flex: none;
    width: 40px;
    height: 40px;
    border-radius: 12px;
    background: color-mix(in srgb, var(--dot-color) 14%, transparent);
  }

  &__body { flex: 1; min-width: 0; }
  &__label { font-weight: 600; }
  &__meta { color: var(--color-text-muted); font-size: 13px; }
  &__amount { font-weight: 700; font-variant-numeric: tabular-nums; }

  &--selected { background: var(--color-accent-soft); }

  // Desktop : la ligne devient une rangée de tableau
  @include up(lg) {
    display: grid;
    grid-template-columns: 120px minmax(0, 1fr) 150px 100px;
    min-height: 56px;
    padding-inline: space(4);
  }
}
```

```tsx
// domains/expenses/ui/ExpenseRow/ExpenseRow.tsx
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import type { CSSProperties } from 'react';
import { formatMoney } from '@/shared/i18n/format';
import './ExpenseRow.scss';

export interface ExpenseRowProps {
  expense: ExpenseView;
  selected?: boolean;
  onSelect?: (id: string) => void;
}

export function ExpenseRow({ expense, selected = false, onSelect }: ExpenseRowProps) {
  const { t } = useTranslation('expenses');
  return (
    <button
      type="button"
      className={clsx('expense-row', selected && 'expense-row--selected')}
      style={{ '--dot-color': expense.categoryColor } as CSSProperties}
      onClick={() => onSelect?.(expense.id)}
      aria-label={t('row.aria', { label: expense.label })}
    >
      <span className="expense-row__icon" aria-hidden="true" />
      <span className="expense-row__body">
        <span className="expense-row__label">{expense.label}</span>
        <span className="expense-row__meta">{expense.categoryLabel}</span>
      </span>
      <span className="expense-row__amount">{formatMoney(-expense.amount)}</span>
    </button>
  );
}
```

**Valeurs dynamiques** (couleur d'une catégorie, largeur d'une barre) : on les passe par une **variable CSS** posée en `style` (`--dot-color`), et le SCSS l'utilise. On n'écrit pas de propriétés de style complètes en ligne.

### 7.5 Vérification automatique (stylelint)

```json
{
  "extends": ["stylelint-config-standard-scss"],
  "rules": {
    "selector-class-pattern": [
      "^[a-z][a-z0-9]*(-[a-z0-9]+)*(__[a-z0-9]+(-[a-z0-9]+)*)?(--[a-z0-9]+(-[a-z0-9]+)*)?$",
      { "resolveNestedSelectors": true, "message": "Utiliser la nomenclature BEM : bloc__element--modificateur" }
    ],
    "selector-max-id": 0,
    "max-nesting-depth": 2,
    "declaration-no-important": true
  }
}
```

---

## 8. Traductions (i18n)

### 8.1 Règles

- **Aucun texte en dur** dans le JSX, y compris `aria-label`, `placeholder`, `title` et messages d'erreur. La règle ESLint `i18next/no-literal-string` fait échouer la vérification si un texte apparaît.
- Langue par défaut : **français** (`fr`). La structure prévoit l'anglais (`en`) pour plus tard, sans l'implémenter maintenant.
- Les balises `<html lang>` suivent la langue active.

### 8.2 Organisation des fichiers

```
shared/i18n/
├── index.ts               # initialisation i18next
├── format.ts              # formatMoney, formatDate, formatRelativeDay
├── i18next.d.ts           # typage des clés (autocomplétion et erreurs de clé inconnue)
└── locales/
    └── fr/
        ├── common.json
        ├── expenses.json
        ├── analytics.json
        ├── categories.json
        └── settings.json
```

Un **namespace par contexte** (`expenses`, `analytics`, `settings`), pour ne charger que ce qui est utile.

### 8.3 Clés

- Format hiérarchique en `camelCase` : `expenses:form.amount.label`.
- La clé décrit **où** et **quoi**, jamais le texte lui-même (`form.actions.save`, pas `enregistrer`).
- Pluriels avec les suffixes i18next `_one` / `_other`, jamais de concaténation de mots.
- Variables avec `{{ }}`, jamais de texte découpé en morceaux.

```json
{
  "form": {
    "titleCreate": "Nouvelle dépense",
    "titleEdit": "Modifier la dépense",
    "amount": { "label": "Montant" },
    "date": { "today": "Aujourd'hui", "yesterday": "Hier", "other": "Autre date" },
    "actions": {
      "save": "Enregistrer",
      "saveAndAddAnother": "Enregistrer et en ajouter une autre",
      "delete": "Supprimer cette dépense"
    }
  },
  "toast": { "deleted": "Dépense supprimée", "undo": "Annuler" },
  "count_one": "{{count}} dépense",
  "count_other": "{{count}} dépenses"
}
```

### 8.4 Formats : toujours `Intl`

- Montants, dates et pourcentages sont formatés dans `format.ts` avec `Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' })` et `Intl.DateTimeFormat`. Aucun composant ne formate à la main.
- Le formatage français utilise des espaces insécables. Les tests normalisent les espaces avant de comparer.
- Le signe « − » des dépenses est géré dans `formatMoney`, à un seul endroit (à vérifier dans un test).

### 8.5 Catégories : texte du système ou texte de l'utilisateur

- Les catégories et sous-catégories fournies par défaut ont une **clé système** (`groceries`, `groceries.meat`) et leur libellé vient du fichier de traduction `categories.json`.
- Si l'utilisateur les renomme, ou en crée une, le libellé est stocké **tel quel dans les données** et n'est pas traduit.

### 8.6 Tests

- Un test vérifie que toutes les langues ont exactement les mêmes clés.
- Les tests de composants utilisent la vraie initialisation i18next avec le français, et cherchent par rôle et par libellé.

---

## 9. Bonnes pratiques React

**Composants**
- Composants fonctionnels et hooks uniquement.
- Composants **purs** : même props, même rendu. Pas d'accès direct au réseau ou à la base dans un composant de présentation.
- **Composition** avant configuration : plutôt qu'un composant avec 15 props, on assemble des composants plus petits.
- Props typées avec des interfaces, pas de `any`. Valeurs par défaut dans la signature.

**État**
- Données persistées : Dexie + `useLiveQuery` (l'interface se met à jour toute seule quand la base change).
- État d'interface éphémère (panneau ouvert, filtre actif) : `useState` en local, ou Zustand si plusieurs écrans le partagent.
- Ne pas stocker dans un état ce qui se **calcule** à partir d'un autre état. On calcule pendant le rendu (`useMemo` seulement après mesure).
- `useEffect` sert à se synchroniser avec l'extérieur (événements réseau, service worker), pas à dériver des données.

**Formulaires**
- React Hook Form + un schéma Zod qui réutilise les règles du domaine (`parseEuroInput`, montant > 0).
- Le montant est un champ texte avec `inputmode="decimal"`, converti en centimes à l'enregistrement.

**Performance**
- `React.lazy` + `Suspense` pour chaque route et pour les graphiques.
- `key` stable (l'`id` de la dépense), jamais l'index.
- Pas d'optimisation prématurée : on mesure avec le profiler avant d'ajouter `memo`.

**Robustesse**
- Une `ErrorBoundary` par route, avec un message traduit et une action de reprise.
- Chaque écran gère ses états **vide**, **chargement** et **erreur** (voir section 13).

**Accessibilité**
- HTML sémantique : `<button>` pour une action, `<a>` pour une navigation, `<label>` liés aux champs, `<h1>` unique par page.
- Fenêtres et panneaux via Radix (piège du focus, fermeture avec Échap).
- Les notifications (« Dépense supprimée ») utilisent `aria-live="polite"`.
- Contrastes AA. L'information ne repose jamais sur la couleur seule : la puce de catégorie est toujours accompagnée de son nom.
- Respect de `prefers-reduced-motion`.

**Code**
- TypeScript `strict`, `noUncheckedIndexedAccess` activé.
- Un fichier, une responsabilité. Un composant dépasse rarement 150 lignes.
- Commentaires pour expliquer le **pourquoi**, pas le quoi.

---

## 10. Hors ligne, synchronisation et PWA

### 10.1 Principe local first

1. Toute écriture va **d'abord** dans IndexedDB (Dexie). L'interface se met à jour immédiatement.
2. Chaque enregistrement modifié est marqué « à synchroniser ».
3. Le moteur de synchronisation envoie les changements et récupère ceux de l'autre appareil.

### 10.2 Déclencheurs de synchronisation

Sur iOS, la synchronisation en arrière-plan n'est pas disponible pour une PWA. On synchronise donc :

- au démarrage de l'application,
- quand l'application repasse au premier plan (`visibilitychange`),
- quand le réseau revient (`online`),
- quelques secondes après chaque écriture (avec délai d'attente pour regrouper),
- à la demande, depuis les Réglages.

### 10.3 Protocole

```
POST /api/sync
Authorization: Bearer <code secret>
Corps    : { "since": "2026-09-20T10:00:00.000Z", "changes": [ { "table": "expenses", "record": { … } } ] }
Réponse  : { "serverTime": "2026-09-20T10:05:00.000Z", "changes": [ … ] }
```

- **Conflits** : le plus récent gagne, enregistrement par enregistrement (`updatedAt`). Avec un seul utilisateur, les vrais conflits sont rares.
- **Suppressions** : elles voyagent comme les autres modifications grâce à `deletedAt`.
- **Base serveur** (Cloudflare D1) : une table `records(vault_id, table_name, id, data, updated_at, deleted_at)`.

### 10.4 Code secret

- Généré **sur l'appareil** avec `crypto.getRandomValues`, d'au moins **128 bits** : par exemple 28 caractères en base32, affichés par groupes de 4 (7 groupes). Le masque à 3 groupes de la maquette est seulement illustratif.
- Le serveur ne stocke **jamais** le code : il utilise son empreinte SHA-256 comme identifiant de coffre (`vault_id`).
- Le code n'apparaît dans aucun journal, aucune URL. Il est envoyé dans un en-tête `Authorization` en HTTPS uniquement.
- Limitation du nombre de requêtes par adresse IP côté serveur.
- Appairage d'un nouvel appareil : saisie du code, ou QR code affiché depuis les Réglages du premier appareil.
- La perte du code empêche de relier un **nouvel** appareil : d'où l'export JSON et un avertissement clair dans les Réglages.

### 10.5 PWA

- **vite-plugin-pwa** avec un service worker qui met en cache l'application (précache) : elle démarre hors ligne.
- Mise à jour : `registerType: 'prompt'`. Quand une nouvelle version est prête, l'utilisateur voit un message « Mise à jour disponible » et choisit le moment.
- Manifest : `display: "standalone"`, `theme_color` et `background_color`, icônes 192 et 512 px (dont une « maskable »), `lang: "fr"`.
- iOS : ajouter `apple-touch-icon` (180 px), `apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style`.
- Demander un stockage durable avec `navigator.storage.persist()` au premier lancement.
- L'application installée sur l'écran d'accueil de l'iPhone et Safari ont **chacun leur stockage local** : c'est une raison de plus pour que la synchronisation passe par le serveur.
- À tester sur un vrai iPhone : installation depuis Safari (Partager → Sur l'écran d'accueil), mode avion, retour en ligne.

### 10.6 Export et import

- Export **CSV** (une ligne par dépense, avec les libellés) pour un tableur.
- Sauvegarde **JSON** complète (dépenses, catégories, tags, réglages) avec un numéro de version du format.
- L'import valide le fichier avec Zod avant d'écrire, et ne remplace rien sans confirmation.

---

## 11. Qualité, tests et Git

**Pyramide de tests**
1. **Domaine** (Vitest) : couverture visée 100 % (parsing des montants, projection, agrégats, invariants).
2. **Composants** (Testing Library) : on cherche par rôle et par libellé, comme un utilisateur. Test à 390 px en premier.
3. **Parcours** (Playwright) : ajouter une dépense, la modifier, la supprimer puis l'annuler, changer de mois, hors ligne puis retour en ligne. Projet iPhone en premier.

**Outils** : ESLint, Prettier, stylelint sont lancés à chaque commit (Husky + lint-staged) et en intégration continue.

**Git**
- Branche `main` toujours déployable, une branche par fonctionnalité.
- Commits au format Conventional Commits (`feat(expenses): ajoute le panneau de modification`).
- Une pull request = une fonctionnalité. La checklist de la section 14 fait partie de sa description.

---

## 12. Correspondance maquettes → composants

| Écran de la maquette | Organismes principaux | Page |
|---|---|---|
| Dashboard (iPhone / Mac) | `MonthHeader`, `SummaryCard`, `CategoryDonut`, `CumulativeChart`, `FocusCard`, `RecentExpenses`, `BottomNav` / `Sidebar` | `DashboardPage` |
| Saisie d'une dépense (iPhone) | `ExpenseForm` avec `AmountKeypad`, `CategoryPicker`, `SubcategoryPicker`, `DateQuickPicker`, `TagInput` | `ExpenseCreatePage` |
| Saisie d'une dépense (Mac) | `ExpenseForm` dans un `SidePanel` | ouverte depuis `DashboardPage` et `HistoryPage` |
| Historique (iPhone) | `SearchField`, `FilterBar`, `ExpenseList` (groupée par jour), `SwipeActions`, `UndoToast` | `HistoryPage` |
| Historique (Mac) | `ExpenseTable`, `EditPanel` | `HistoryPage` |
| Modifier une dépense (iPhone) | `ExpenseForm` en mode édition | `ExpenseEditPage` |
| Focus | `FocusSwitcher`, `FocusSummary`, `WeeklyBars`, `CategoryShare`, `FocusEntries` | `FocusPage` |
| Réglages (iPhone / Mac) | `SettingsSection`, `SettingsRow`, `SecretCodeField`, `DeviceList`, `DataActions` | `SettingsPage` |
| Catégories proposées | `CategoryCard`, `SubcategoryChips`, `TagList` | intégré à `SettingsPage` |

`ExpenseForm` est **un seul composant** pour la création et la modification, sur mobile et sur desktop. Seul son conteneur change (écran plein ou panneau latéral).

---

## 13. Écrans à concevoir avant ou pendant le développement

Ces écrans ne sont pas dans les maquettes actuelles :

- **Premier lancement** : création du code secret, ou saisie d'un code existant, avec l'avertissement sur sa conservation.
- **Gestion des catégories, sous-catégories et tags** : ajout, renommage, réordonnancement, couleur.
- **Création d'un focus** : choisir une catégorie, une sous-catégorie ou un tag à épingler.
- **Statistiques** : vue « Séjour » sur les 5 mois (comparaison mois par mois). Le dashboard et les focus la remplacent pour l'instant.
- **États vides, chargement et erreurs** : premier mois sans dépense, échec de synchronisation, fichier d'import invalide.
- **Thème sombre** : les tokens sont prévus, les valeurs restent à définir.

---

## 14. Définition de « terminé » (checklist de pull request)

- [ ] Fonctionne à 390 px **en premier**, puis vérifié à 768, 1024 et 1440 px (section 4.8).
- [ ] Aucun texte en dur : toutes les chaînes sont dans les fichiers de traduction.
- [ ] Classes BEM valides, stylelint sans erreur, aucune valeur de couleur écrite en dur (tokens uniquement).
- [ ] Le niveau Atomic Design est respecté (pas d'import d'un niveau supérieur).
- [ ] La logique métier est dans le domaine et testée.
- [ ] États vide, chargement et erreur traités.
- [ ] Navigable au clavier, focus visible, contrastes AA, cibles tactiles de 44 px.
- [ ] Fonctionne hors ligne (ou dégrade proprement).
- [ ] Tests ajoutés ou mis à jour, ESLint et TypeScript sans erreur.
- [ ] Budget de performance mobile respecté.

---

## 15. Feuille de route proposée

| Étape | Contenu | Résultat |
|---|---|---|
| **0. Socle** | Vite, TypeScript strict, SCSS, tokens, i18n, ESLint, stylelint, AppShell mobile first | Projet qui démarre, barre du bas et sidebar |
| **1. Domaine et base locale** | `Money`, `Expense`, catégories par défaut, projection, dépôt Dexie, tests | Logique métier testée |
| **2. Saisie** | `ExpenseForm` (clavier mobile, panneau desktop) | Ajouter des dépenses, rattraper les 19 jours |
| **3. Dashboard** | Chiffres clés, donut, courbe, dernières dépenses | Vue du mois en cours |
| **4. Historique** | Liste, recherche, filtres, modification, suppression, annulation | Correction des erreurs de saisie |
| **5. Focus** | Focus épinglés, vue détaillée | Suivi viande, transport, etc. |
| **6. Réglages** | Séjour, export CSV/JSON, import, thème | Sauvegarde des données |
| **7. Synchronisation** | Code secret, API Cloudflare, moteur de sync | Mac et iPhone connectés |
| **8. PWA et déploiement** | Manifest, service worker, icônes, tests sur iPhone, mise en ligne | Application installée sur l'iPhone |

Chaque étape produit quelque chose d'utilisable. Après l'étape 2, tu peux déjà saisir tes dépenses sur l'iPhone.
