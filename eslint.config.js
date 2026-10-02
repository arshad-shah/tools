import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';
import local from './eslint-rules/index.js';

export default tseslint.config(
  {
    ignores: ['dist', 'public/pdfjs', 'playwright-report', 'test-results'],
  },
  {
    // Every runner (CLI, editor, lint-staged) reports stale disables.
    linterOptions: { reportUnusedDisableDirectives: 'error' },
  },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // eslint-plugin-react-hooks v7 promoted these advisory rules to errors.
      // Keep them as warnings so the dependency bump doesn't break the build on
      // pre-existing code; they can be addressed incrementally.
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/immutability': 'warn',
      'react-hooks/purity': 'warn',
      // eslint 10 / @eslint/js 10 promoted these to errors in the recommended
      // config. They flag stylistic dead stores and a best-practice nudge, not
      // correctness bugs, so keep them advisory for the dependency bump.
      'no-useless-assignment': 'warn',
      'preserve-caught-error': 'warn',
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
    },
  },
  {
    files: ['scripts/**/*.{ts,mjs}', 'test/**/*.ts', '*.config.ts'],
    languageOptions: { globals: { ...globals.node } },
  },
  // Design-system rules (spec 1A): enforced at error, never disabled inline.
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: { local },
    rules: {
      'local/no-pictographic-text': 'error',
      'local/no-lucide-outside-icons': 'error',
      'local/no-disable-enforced': 'error',
    },
  },
  {
    files: ['eslint-rules/**/*.js', 'public/theme-init.js'],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
  },
);
