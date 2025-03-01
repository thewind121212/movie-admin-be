// @ts-check
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      'eslint.config.mjs',
      'uploads/',
      '/processed',
      '/postgres_data',
      '/minio-data',
      '/processed-client',
      '/data-mailpit',
    ],
  },
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      // Consider updating ecmaVersion to a more modern version if you're using modern JS features
      ecmaVersion: 2020,
      sourceType: 'module',
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    rules: {
      // Allow usage of "any"
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      // Relax the rule to allow intentionally unawaited promises (via void)
      '@typescript-eslint/no-floating-promises': ['warn', { ignoreVoid: true }],
      'no-unused-vars': 'warn',
      '@typescript-eslint/no-misused-promises': 'off',
      // If you find no-unsafe-argument too restrictive, you can disable it:
      '@typescript-eslint/no-unsafe-argument': 'off',
    },
  },
);
