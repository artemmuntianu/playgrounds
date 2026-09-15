// ESLint flat config (ESLint 10, `npm run lint`).
//
// The stack the codebase was written for: three `// eslint-disable-next-line
// react-hooks/exhaustive-deps` comments already existed in `src/components` before this config did.
//
// Severity policy (keep `npm run lint` meaningful AND green so it is actually run):
// - errors  = things the code already satisfies today, so a failure means a real regression;
// - warnings = deliberate tolerances of this codebase (`any`, hooks deps, unused vars).
// @ts-check
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import astro from 'eslint-plugin-astro';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

export default tseslint.config(
  {
    ignores: [
      'dist/**',
      '.vercel/**',
      '.astro/**',
      'data/**',
      'public/**',
      'node_modules/**',
      'tools/node_modules/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...astro.configs['flat/recommended'],
  {
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
    // Flat config requires the plugin to be registered in the same object that uses its rules.
    plugins: { 'react-hooks': reactHooks },
    rules: {
      // The two classic hooks rules. eslint-plugin-react-hooks v7 also ships the newer
      // React-Compiler-era rules (static-components, immutability, set-state-in-effect, …); they are
      // opt-in because the existing canvas/effect islands do not satisfy them yet.
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      // `any` is tolerated in this codebase (tracked in TODO-types.md): keep it visible, not fatal.
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  }
);
