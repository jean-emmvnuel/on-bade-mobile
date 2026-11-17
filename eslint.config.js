// https://docs.expo.dev/guides/using-eslint/
// Lancer : npm run lint (la vérification automatique sur GitHub le lance aussi ; seules les erreurs la font échouer).
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
  },
  {
    rules: {
      // Les textes français sont pleins d'apostrophes ; <Text> de React Native n'interprète pas d'entités HTML.
      'react/no-unescaped-entities': 'off',
      // TypeScript vérifie déjà les imports (tsc) ; le résolveur d'ESLint ne voit pas les énumérations réexportées.
      'import/namespace': 'off',
      // Règles du React Compiler : il est désactivé (app.json, experiments.reactCompiler = false). Avertissements à
      // corriger avant de l'activer ; ils ne bloquent pas la vérification automatique.
      'react-hooks/immutability': 'warn',
      'react-hooks/static-components': 'warn',
      'react-hooks/refs': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/purity': 'warn',
      'react-hooks/use-memo': 'warn',
    },
  },
]);
