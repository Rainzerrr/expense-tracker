# Suivi de dépenses Erasmus à Lisbonne

PWA mobile first (iPhone) + site web (Mac). Référence technique : `docs/GUIDE-TECHNIQUE.md`. Maquettes : `docs/maquettes-erasmus-lisbonne.html`. Le guide fait foi, sauf sur les points ci-dessous.

## Décisions qui remplacent le guide

- **Aucun service externe.** Pas de Cloudflare, pas de serveur, pas de compte, pas de code secret. Les sections 10.2 à 10.4 du guide (sync, protocole, code secret) et le contexte `sync` ne sont pas à faire.
- **Pas de synchronisation automatique.** Chaque appareil a sa propre base IndexedDB. **L'iPhone est l'appareil principal (saisie), le Mac sert à consulter.** Le transfert se fait par fichier (AirDrop) : Réglages → « Envoyer » sur l'iPhone, « Recevoir » sur le Mac (fusion, jamais d'écrasement). Une base partagée pourra venir plus tard si la friction gêne ; le modèle (`updatedAt`/`deletedAt`/ULID partout) est déjà prêt pour ça. Les maquettes montrent « Synchronisé avec l'iPhone » et une liste d'appareils : à retirer ou remplacer.
- **Pas de thème sombre.** Uniquement le thème clair (`color-scheme: light`).
- **Mode démo** : l'URL avec `?demo=1` charge un jeu de données de test dans une base IndexedDB **séparée** de la vraie (nom de base distinct), pour ne jamais mélanger les deux. Disponible aussi en production, car c'est voulu par l'utilisateur.
- **Hébergement : Vercel** (site statique uniquement, pas de fonctions serveur). Prévoir un `vercel.json` avec une réécriture de toutes les routes vers `/index.html` (routage côté client) à l'étape 7.
- **Navigation** : « Stats » reste une page vide pour l'instant (écran non conçu). Pas d'entrée « Catégories » dans la barre latérale : la gestion des catégories, sous-catégories et tags sera dans Réglages.
- Catégorie fixe de la projection : Logement, identifiée par sa clé système `housing`, non configurable.

## Écarts techniques par rapport au guide

- Les variables CSS `:root` sont dans `shared/styles/base/_tokens.scss` (et non `abstracts/`) : `abstracts/` est importé par chaque composant et ne doit rien émettre.
- ESLint est en version 9 (`eslint-plugin-jsx-a11y` n'accepte pas encore la 10).
- Les règles ESLint `no-restricted-imports` appliquent Atomic Design (atomes et molécules) et la pureté de `domains/*/domain/`.
- `i18next/no-literal-string` ne contrôle que les attributs lus par un humain (`aria-label`, `title`, `placeholder`, `alt`).

## Où vit quoi (état après l'étape 1)

- `shared/lib/time.ts` : `LocalDate`, `YearMonth`, `todayInLisbon()`, calculs de mois. Toujours passer par là, jamais de `new Date()` dispersé ni de « 30/31 » en dur.
- `domains/expenses/domain` : `Cents`, `parseEuroInput`, `createExpense` / `reviseExpense` (seuls points de création, invariants vérifiés), port `ExpenseRepository`, jeu de démo.
- `domains/categorization` : catalogue par défaut (identifiant = clé système, ex. `groceries.meat`), `FIXED_CATEGORY_IDS`. Libellés : `categories.json` (`<catégorie>.label`, `<catégorie>.sub.<clé>`) si `name` est `null`, sinon `name` tel quel.
- `domains/analytics` : `projectMonthEnd` (cas de référence des maquettes : 970 € dont 420 € de loyer au 20 sept. → 1 245 €).
- `domains/*/infrastructure` + `shared/infrastructure/database.ts` : Dexie. Seul `app/bootstrap.ts` relie les ports à Dexie ; l'UI récupère les dépôts par `useAppServices()`.
- Démo : `?demo=1` (mémorisé en sessionStorage), `?demo=0` pour quitter. Base `expense-tracker-demo` séparée, bandeau visible en permanence.
- Tests : `src/test/services.ts` fournit de vrais dépôts sur `fake-indexeddb` ; préférer ça aux mocks.

## Conventions ajoutées à l'étape 2

- Chaque contexte a deux points d'entrée : `index.ts` (TypeScript pur, utilisable par le domaine) et `react.ts` (hooks + composants légers). `expenses/form.ts` isole le formulaire (React Hook Form + Zod, ~40 Ko gzip) : l'importer depuis un écran d'affichage l'embarquerait dans son chunk. Vérifier après tout ajout : `dist/assets/<Page>-*.js` ne doit pas importer un chunk contenant `ZodError`. Le domaine n'importe jamais `react.ts` (règle ESLint).
- `SidePanel` (Radix Dialog) est le conteneur des formulaires : plein écran sur mobile, panneau à droite dès 1024 px. Il ne fixe pas le focus initial : le contenu s'en charge.
- Formulaire : React Hook Form + Zod. Le schéma ne contient que des **clés de traduction** comme messages d'erreur. `useWatch` (pas `watch`, incompatible React Compiler).
- Saisie du montant : pavé numérique sur mobile (`inputMode="none"` pour masquer le clavier système), clavier natif sur desktop. `sanitizeAmountInput` / `applyKeypadKey` dans le domaine.
- Piège TypeScript : une arrow function qui retourne un type-guard (`isLocalDate`) est inférée comme type-guard ; annoter `: boolean` quand le type nominal ne doit pas fuiter (ex. `refine` Zod).
- **Les panneaux ne sont pas des routes** : saisie = `?new=1`, modification = `?edit=<id>`, gérés par `app/panels.ts` (`useNewExpensePanel`, `useEditExpensePanel`). La page en dessous reste affichée, le bouton retour ferme le panneau. Un lien qui ouvre un panneau utilise `to={panel.openTo} state={panel.openState}` (le `state` permet de fermer par un retour arrière).

## Conventions ajoutées à l'étape 3

- **Graphiques en SVG maison, pas de Recharts** (écart au guide, décidé pour ne pas ajouter ~100 Ko pour un donut et une courbe). La géométrie est pure et testée dans `shared/lib/chart.ts` ; `useContainerWidth` dessine à la largeur réelle pour que les textes gardent leur taille. Chaque graphique a un `aria-label` en phrase et une légende chiffrée.
- **Horloge injectable** : `useAppServices().now()` / `useToday()`. Ne jamais appeler `new Date()` dans l'UI. Les tests figent le 20 septembre 2026 (`TEST_NOW` dans `src/test/services.ts`) : les tests du dashboard reproduisent les chiffres exacts des maquettes.
- Mois affiché = `?month=YYYY-MM` (`useSelectedMonth`), borné du début du séjour au mois en cours (pas de navigation dans le futur).
- `summarizeMonth` (domaine, pur) calcule tout le dashboard ; `useMonthSummary` l'alimente avec une requête « vivante » Dexie : l'écran se met à jour seul après une saisie.
- Une `<section>` doit avoir un nom (`aria-labelledby`) pour être une région accessible : `CardSection` s'en charge.

## Conventions ajoutées à l'étape 4

- **Historique = une seule liste**, sans tableau HTML : sur mobile des cartes par jour, dès 1024 px les lignes deviennent des rangées de grille (colonnes placées explicitement avec `grid-column`, sinon une cellule absente décale les suivantes). Recherche, filtres et mois sont dans l'adresse (`?q=`, `?category=`, `?tag=`, `?month=`).
- **Glissement mobile en CSS pur** (`overflow-x` + `scroll-snap`), toujours doublé d'un vrai lien « Modifier » sur la ligne (règle du guide 4.4). Pas de bibliothèque de gestes.
- **Filtres = `<select>` natifs** rendus invisibles par-dessus une pastille (`FilterSelect`) : sélecteurs iOS/macOS, clavier et lecteurs d'écran gratuits.
- **Suppression** : toujours logique (`deletedAt`) puis toast « Annuler » (`useDeleteWithUndo`, store Zustand `app/undoToast.ts`, Radix Toast). Le toast vit dans `RootLayout` : il survit à la fermeture du panneau.
- **Ordre d'affichage** : date, puis `createdAt`, puis identifiant (ULID monotone via `newId()`). Ne pas casser : le jeu de démo insère tout au même instant.
- `ExpenseForm` sert à créer et à modifier (`mode`, `defaultValues`, `onDelete`). En modification sur mobile, le pavé numérique est fermé tant qu'on ne touche pas le montant.
- Tests : jsdom ne fournit pas `hasPointerCapture` (Radix) : polyfill dans `src/test/setup.ts`. Dans les tests, attendre une **ligne de dépense** (pas `listitem` : la navigation en contient déjà).

## Sauvegarde et transfert (contexte `backup`)

- **Format** `lisboa-expenses` v1 (`domain/backupFile.ts`) : `{ format, version, exportedAt, data: { expenses, categories, subcategories, tags } }`. Il contient **aussi les éléments supprimés logiquement** : c'est ce qui propage les suppressions. Un fichier de version supérieure est refusé.
- **Fusion** (`domain/mergeBackup.ts`, pure, très testée) : par identifiant, la version au `updatedAt` le plus récent gagne ; deux tags de même nom créés séparément n'en font qu'un ; une dépense qui référence une catégorie inconnue est ignorée. Idempotent : réimporter le même fichier ne change rien.
- **Import en deux temps** : `previewImport` (ne modifie rien) puis `applyImport` (recalcule la fusion sur l'état actuel, écrit dans **une transaction**).
- **Zod n'est chargé qu'à l'import** (`import()` dynamique dans `previewImport`, module `parseBackup.ts`). Ne pas l'importer statiquement depuis `index.ts`-via-dashboard : ça coûte ~23 Ko gzip au démarrage.
- **Deux points d'entrée React** : `backup/react.ts` (léger : rappel, statut) pour le dashboard ; `backup/data.ts` (cartes d'envoi/import/CSV) pour Réglages.
- **Rappel** : `backupReminderDays` — modifications locales non sauvegardées depuis ≥ 7 jours. Un appareil qui ne fait qu'importer (le Mac) n'est jamais relancé. Jamais en mode démo (envoi et import y sont désactivés pour ne pas mélanger démo et vraies données).
- **Base v2** : `updatedAt`/`deletedAt` ajoutés au catalogue (migration : date d'époque `EPOCH_INSTANT` pour les données par défaut, donc identiques sur tous les appareils), table `meta` (`lastExportAt`, `lastImportAt`).
- **Non vérifié sur un vrai iPhone** : le menu Partager avec un fichier `.json` (repli automatique vers le téléchargement), et le téléchargement dans la PWA installée. À tester avant de compter dessus.
- CSV : `;` en séparateur, CRLF, UTF-8 avec BOM (vérifié sur les octets), et neutralisation des formules (`=`, `+`, `-`, `@`).

## Budget de poids

`npm run size` construit puis pèse le JS réellement téléchargé par écran (entrée + imports statiques + écran) et **échoue au-delà de 170 Ko gzip**. Ne pas se fier à une estimation à l'œil : le découpage en chunks change à chaque ajout. Dernière mesure : dashboard 157, historique 151, réglages 150. Leviers déjà utilisés : Zod chargé à l'import, toast Radix chargé à la première suppression, jeu de démo chargé en mode démo seulement (les panneaux de saisie/modification sont chargés à la demande, hors budget).

## Focus (contexte `focus`, étape 5)

- **Contexte à part** (le guide les range dans `analytics`) : ils ont leurs données (`focuses` : `kind` = category/subcategory/tag, `targetId`, `position`, `updatedAt`, `deletedAt`), leur dépôt et leur écran. Base v3. Ils voyagent dans la sauvegarde (`data.focuses`, **optionnel à la lecture** : un fichier d'avant les focus se relit comme « aucun focus »).
- **Calculs purs** (`domain/focusStats.ts`) : total, achats, panier moyen, part du mois, rythme par semaine (`total ÷ jours écoulés × 7`), barres par semaine (1–7, 8–14, 15–21, 22–28, 29–fin), composition. Les tests reproduisent les chiffres de la maquette (viande : 58 €, 7 achats, 8,29 €, 6 %).
- **Trois points d'entrée React** pour ne charger que le nécessaire : `react.ts` (dashboard : `FocusCards`), `detail.ts` (page Focus), `manager.ts` (panneau de gestion).
- **Route `/focus` et `/focus/:focusId`** : sans identifiant (ou identifiant périmé) on **affiche** le premier focus, on ne redirige pas — une redirection à l'affichage écrasait un clic sur « Retour » pendant le chargement.
- Gestion = panneau `?focus=manage` (`useFocusManagerPanel`). Le réordonnancement se fait par boutons (↑ ↓), avec retour du focus clavier sur le bouton après déplacement (ref posée avant l'action).
- Fusion entre appareils : deux focus sur la même cible sous deux identifiants n'en font qu'un ; les positions sont recalculées de 0 à n-1 à chaque déplacement.
- **Démo** : trois focus (viande, transport, restaurants), chargés à la demande (`app/seedDemo.ts`). En usage réel, aucun focus par défaut.
- Sous-catégorie → l'historique n'a pas de filtre dédié : le lien « Voir les N entrées » passe par la recherche texte (`?q=Viande`).

## Import de relevés bancaires (contexte `statements`)

- **Pas d'automatisation** : Revolut n'offre de webhooks qu'à l'API _Business_ ; un compte personnel n'en a pas, et un webhook exigerait un serveur (exclu). L'import se fait par **relevé CSV** (Revolut → Compte → Relevé), sur **n'importe quelle période** (pas seulement des mois) : les doublons sont ignorés, donc les périodes peuvent se chevaucher.
- **Format lu** (`domain/revolutStatement.ts`) : colonnes françaises ou anglaises (`Type, Produit, Date de début, Date de fin, Description, Montant, Frais, Devise, État, Solde`), séparateur `,` ou `;`. On utilise la **date de DÉBUT** (le jour de l'achat), pas celle de fin (règlement, 1 à 3 jours après). Montants : format strict (une ligne douteuse est comptée « illisible », jamais devinée). Le fichier réel de l'utilisateur est lu par un test local (`describe.skipIf`), exclu de git (`account-statement_*.csv` dans `.gitignore`) : **ne jamais copier de vraies données bancaires dans le dépôt**.
- **Ce qui est importé** : paiements par carte (et frais, prélèvements) terminés, en euros, dans le séjour. **Ignoré avec sa raison affichée** : en attente (importé au prochain relevé), annulé/refusé, autre devise, recharges, entrées d'argent, autres types (listés), hors séjour, déjà importé. **Virements et retraits** : proposés mais sur « Ne pas importer » par défaut (ça peut être le loyer ou un ami).
- **Doublons** : chaque opération a une `externalRef` (`revolut:début|commerçant|montant|frais`, `#n` pour deux opérations identiques à la seconde). Elle est comparée à **toutes** les dépenses, **supprimées comprises** : une dépense supprimée ne revient jamais. `mergeBackup` écarte aussi deux dépenses de même `externalRef` (import du même relevé sur deux appareils).
- **Catégorisation** (`domain/merchantRules.ts`) : règles apprises (exactes, par commerçant normalisé) > règles livrées (mots-clés en début de mot, volontairement prudents) > « à classer ». L'utilisateur confirme la catégorie de chaque commerçant à l'aperçu ; **seuls les changements sont retenus** (table `merchantRules`, base v4, incluse dans la sauvegarde). L'import est bloqué tant qu'un commerçant reste « à classer ».
- La dépense garde le commerçant en `note` (affichée dans l'historique, cherchable, colonne « Note » du CSV). Deux étapes comme l'import de sauvegarde : `previewStatement` (n'écrit rien) puis `importStatement` (revérifie les références au moment de confirmer).
- Piège d'ergonomie déjà rencontré : dans un `<select>` fermé, seul le texte de l'option s'affiche — préfixer la sous-catégorie par sa catégorie.

## Budget mensuel (contexte `budget`)

- Onglet **Stats retiré** (route, page, icône `trend`, entrées de nav) : il ne menait qu'à un écran vide. Remplacé par un vrai objectif chiffré, plus utile qu'une page de statistiques vide.
- Trois lignes, données par l'utilisateur : **Logement** 1 000 €, **Courses + Activités réunies** 400 € (objectif _souple_ : on peut puiser dans l'une pour l'autre, le dépasser n'est pas grave), **Total du mois** 1 400 € (le seul objectif dur — « ne pas dépasser 1400€ au total »). `domain/budget.ts` (`DEFAULT_BUDGET`, `FLEX_CATEGORY_IDS = [groceries, activities]`), `domain/budgetStatus.ts` (calcul pur, testé).
- Base v5, une seule ligne (`id: 'current'`). Dans la sauvegarde comme les autres domaines (la plus récente `updatedAt` gagne), avec un piège propre à un singleton : pas de `mergeById`, une fonction `mergeBudget` dédiée (`local`/`incoming` peuvent être `null` si jamais réglé).
- **`ProgressBar` a maintenant un `tone`** (`accent`/`warning`/`danger`) : `warning` pour un dépassement sans gravité (courses + activités), `danger` pour le logement et le total.
- Piège déjà rencontré : ne pas remonter (`key=...`) un formulaire contrôlé juste après qu'il ait écrit sa propre donnée — le composant perd son état local (message « Enregistré ») avant que l'utilisateur ne le voie. `BudgetSettingsCard` ne force donc pas de remontage ; un import externe pendant que Réglages est ouvert n'est repris qu'à la prochaine ouverture de l'écran (comme le reste des formulaires de l'app).
- Trois points d'entrée React comme les autres contextes : `react.ts` (dashboard, léger), `settings.ts` (formulaire de réglage), `index.ts` (pur).

## Barre de navigation

`BottomNav` répartit `leadingItems`/`trailingItems` dans deux groupes flexibles de largeur égale (`&__side { flex: 1 }`), pas une grille à 5 colonnes fixes : le bouton central reste centré même à 1 contre 2 (aujourd'hui : Accueil seul à gauche, Historique + Réglages à droite).

## PWA et déploiement

- **vite-plugin-pwa** (Workbox `generateSW`), `registerType: 'prompt'` : une nouvelle version n'est jamais appliquée sans clic (`app/UpdatePrompt.tsx`, bandeau « Mettre à jour »). Le service worker n'existe qu'au **build** (`npm run build` puis `npx vite preview`), pas en `npm run dev`.
- **Hors ligne vérifié** : serveur arrêté, `/history` et le panneau de saisie (chunks paresseux, Zod compris) se chargent depuis le cache. Précache : tout `dist` sauf la police vietnamienne. Navigation hors ligne = `navigateFallback: /index.html`.
- **Icônes** générées à partir de `public/logo.svg` par `npm run icons` (`pwa-assets.config.ts`) : ne pas éditer les PNG à la main. Le logo est plein cadre (le système arrondit les coins) ; l'épaisseur du trait est dans le repère du pictogramme (déjà piégé une fois : trait ×13).
- **Test** : `virtual:pwa-register/react` est remplacé en test par `src/test/pwaRegisterStub.ts` (alias dans `vite.config.ts`, actif si `VITEST`).
- **Stockage** : `requestPersistentStorage()` au démarrage (`main.tsx`) ; Réglages affiche « Protégé / Non protégé » (`StorageStatus`). Chrome bureau répond « non » tant que l'engagement est faible : c'est normal. Sur iPhone, ce qui protège vraiment les données, c'est l'**installation sur l'écran d'accueil**.
- **Vercel** (`vercel.json`) : réécriture de toutes les routes vers `/index.html`, `sw.js`/`index.html`/manifest sans cache, `/assets/*` immuables, en-têtes de durcissement. **Pas de CSP** volontairement (non testable hors Vercel) : à ajouter une fois en ligne. Réglages du projet Vercel : framework Vite, build `npm run build`, sortie `dist`, Node 22.
- **Piège iPhone** : la PWA installée et Safari ont **chacun leur stockage**. Installer l'app _avant_ de saisir de vraies dépenses ; sinon, ce qui a été saisi dans un onglet Safari doit passer par Envoyer → Recevoir.

## Commandes

- `npm run dev` (`dev:lan` pour tester depuis l'iPhone sur le même Wi-Fi)
- `npm run check` : typecheck + ESLint + stylelint + tests. À passer avant chaque commit.
- Gestionnaire de paquets : npm.

## Avancement (étapes du guide, section 15)

- [x] 0. Socle
- [x] 1. Domaine et base locale
- [x] 2. Saisie (création uniquement ; la modification arrive à l'étape 4)
- [x] 3. Dashboard (sans les focus, qui sont à l'étape 5)
- [x] 4. Historique (liste, recherche, filtres, modification, suppression + annulation)
- [x] 5. Focus (cartes du dashboard, page de détail, gestion : épingler / retirer / réordonner)
- [~] 6. Réglages : **export/import/CSV/rappel faits** (fait avant l'étape 5) ; reste : dates du séjour, gestion des catégories/tags, à propos
- [~] 7. PWA : **code fait et vérifié hors ligne** (service worker, manifest, icônes, mise à jour, stockage persistant, `vercel.json`) ; reste : mise en ligne sur Vercel et test sur un vrai iPhone
