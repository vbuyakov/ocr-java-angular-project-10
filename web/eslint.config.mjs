import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ignores: [
      'dist/**',
      'out-tsc/**',
      '.angular/**',
      'node_modules/**',
      'playwright-report/**',
      'test-results/**',
      'e2e/**',
      '**/*.spec.ts',
      '**/*.test.ts',
    ],
  },
  {
    files: ['**/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
);
