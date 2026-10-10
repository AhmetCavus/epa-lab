import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['**/dist/**', '**/node_modules/**', '**/coverage/**'] },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked.map((config) => ({
    ...config,
    files: ['services/**/*.ts'],
  })),
  {
    files: ['**/*.mjs', '**/*.cjs'],
    languageOptions: {
      globals: { process: 'readonly', console: 'readonly', module: 'readonly' },
    },
  },
  {
    files: ['services/**/*.ts'],
    languageOptions: {
      parserOptions: {
        project: './services/epa-authorization/tsconfig.json',
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
    },
  },
);
