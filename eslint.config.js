import js from '@eslint/js';
import i18next from 'eslint-plugin-i18next';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

// Le domaine reste du TypeScript pur : aucune dépendance vers l'UI ou l'infrastructure.
const domainForbidden = [
  'react',
  'react-dom',
  'react-router-dom',
  'react-i18next',
  'i18next',
  'dexie',
];

// Un niveau d'Atomic Design n'importe que les niveaux inférieurs.
const uiLevels = ['atoms', 'molecules', 'organisms', 'templates'];
const higherLevelsThan = (level) => {
  const higher = uiLevels.slice(uiLevels.indexOf(level) + 1);
  return [...higher.map((h) => `@/shared/ui/${h}/*`), '@/pages/*', '@/domains/*', '@/app/*'];
};

export default tseslint.config(
  { ignores: ['dist', 'coverage', 'docs'] },
  js.configs.recommended,
  tseslint.configs.recommended,
  reactHooks.configs.flat.recommended,
  jsxA11y.flatConfigs.recommended,
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: { globals: globals.browser },
    plugins: { i18next },
    rules: {
      // On ne vérifie que les attributs lus par un humain ou un lecteur d'écran,
      // pas les props techniques (layout="stacked", name="plus"…).
      'i18next/no-literal-string': [
        'error',
        {
          mode: 'jsx-only',
          'jsx-attributes': {
            include: [
              'aria-label',
              'aria-description',
              'aria-placeholder',
              'placeholder',
              'title',
              'alt',
            ],
          },
        },
      ],
      'no-restricted-syntax': [
        'error',
        { selector: 'ExportDefaultDeclaration', message: 'Utiliser un export nommé.' },
      ],
    },
  },
  {
    files: ['src/**/*.test.{ts,tsx}', 'src/test/**'],
    rules: { 'i18next/no-literal-string': 'off' },
  },
  ...uiLevels.slice(0, 2).map((level) => ({
    files: [`src/shared/ui/${level}/**/*.{ts,tsx}`],
    rules: {
      'no-restricted-imports': ['error', { patterns: higherLevelsThan(level) }],
    },
  })),
  {
    files: ['src/domains/*/domain/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: domainForbidden,
          patterns: [
            '@/domains/*/application/*',
            '@/domains/*/infrastructure/*',
            '@/domains/*/ui/*',
            '@/domains/*/react',
            '@/domains/*/form',
            '@/domains/*/data',
            '@/domains/*/settings',
            '@/domains/*/detail',
            '@/domains/*/manager',
            '@/shared/ui/*',
          ],
        },
      ],
    },
  },
  {
    // Scripts Node (mesure du poids du bundle…) : pas de navigateur, pas de règles d'interface.
    files: ['*.config.{js,ts}', 'scripts/**/*.mjs'],
    languageOptions: { globals: globals.node },
    rules: { 'no-restricted-syntax': 'off' },
  },
);
